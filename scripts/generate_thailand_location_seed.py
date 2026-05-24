from __future__ import annotations

import argparse
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import xml.etree.ElementTree as ET


NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
OFFICIAL_SOURCE_PAGE = "https://stat.bora.dopa.go.th/stat/statnew/statMenu/newStat/ccaa/"
OFFICIAL_SOURCE_FILE = "https://stat.bora.dopa.go.th/dload/ccaatt.xlsx"


@dataclass(frozen=True)
class LocationRow:
    code: str
    name_th: str
    name_en: str
    retired_on: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Thailand province/district seed SQL from official DOPA ccaatt.xlsx."
    )
    parser.add_argument(
        "--source",
        default=r"C:\Work\RacketThailand\tmp\ccaatt.xlsx",
        help="Path to the official ccaatt.xlsx download.",
    )
    parser.add_argument(
        "--provinces-out",
        default=r"C:\Work\RacketThailand\docs\provinces-seed.sql",
        help="Output path for province seed SQL.",
    )
    parser.add_argument(
        "--districts-out",
        default=r"C:\Work\RacketThailand\docs\districts-seed.sql",
        help="Output path for district seed SQL.",
    )
    parser.add_argument(
        "--verify-out",
        default=r"C:\Work\RacketThailand\docs\location-reference-verify.sql",
        help="Output path for verification SQL.",
    )
    return parser.parse_args()


def load_shared_strings(book: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    shared_strings: list[str] = []
    for item in root.findall("a:si", NS):
        shared_strings.append("".join(node.text or "" for node in item.iterfind(".//a:t", NS)))
    return shared_strings


def iter_rows(path: Path) -> tuple[str, list[LocationRow]]:
    with zipfile.ZipFile(path) as book:
        shared_strings = load_shared_strings(book)
        worksheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
        rows = worksheet.find("a:sheetData", NS)
        if rows is None:
            raise RuntimeError("Worksheet is missing sheetData.")

        source_date = ""
        parsed_rows: list[LocationRow] = []

        for row in rows:
            values: dict[str, str] = {}
            for cell in row.findall("a:c", NS):
                ref = cell.get("r", "")
                column = "".join(ch for ch in ref if ch.isalpha())
                value_node = cell.find("a:v", NS)
                if value_node is None:
                    value = ""
                elif cell.get("t") == "s":
                    value = shared_strings[int(value_node.text or "0")]
                else:
                    value = value_node.text or ""
                values[column] = value.strip()

            row_number = row.get("r", "")
            if row_number == "3":
                source_date = values.get("A", "")

            code = values.get("A", "")
            if not code or not code[0].isdigit():
                continue

            parsed_rows.append(
                LocationRow(
                    code=code,
                    name_th=values.get("B", ""),
                    name_en=values.get("C", ""),
                    retired_on=values.get("D", ""),
                )
            )

    if not source_date:
        raise RuntimeError("Could not detect source date from row 3.")

    return source_date, parsed_rows


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def build_provinces(rows: Iterable[LocationRow]) -> list[tuple[int, str, str]]:
    provinces: list[tuple[int, str, str]] = []
    for row in rows:
        if row.retired_on != "0":
            continue
        if row.code.endswith("000000"):
            provinces.append((int(row.code[:2]), row.name_th, row.name_en))
    return sorted(provinces, key=lambda item: item[0])


def build_districts(rows: Iterable[LocationRow]) -> list[tuple[int, int, str, str]]:
    districts: list[tuple[int, int, str, str]] = []
    for row in rows:
        if row.retired_on != "0":
            continue
        if row.code.endswith("000000"):
            continue
        if row.code.endswith("0000"):
            province_id = int(row.code[:2])
            district_id = int(row.code[:4])
            districts.append((district_id, province_id, row.name_th, row.name_en))
    return sorted(districts, key=lambda item: item[0])


def write_provinces_sql(path: Path, source_date: str, provinces: list[tuple[int, str, str]]) -> None:
    values = ",\n".join(
        f"  ({province_id}, '{sql_escape(name_th)}', '{sql_escape(name_en)}')"
        for province_id, name_th, name_en in provinces
    )
    path.write_text(
        "\n".join(
            [
                "-- Seed public.provinces from official DOPA/BORA administrative data.",
                f"-- Source page: {OFFICIAL_SOURCE_PAGE}",
                f"-- Source file: {OFFICIAL_SOURCE_FILE}",
                f"-- Source workbook label: {source_date}",
                f"-- Expected active rows: {len(provinces)} provinces.",
                "",
                "begin;",
                "",
                "insert into public.provinces (id, name_th, name_en)",
                "values",
                values,
                "on conflict (id) do update",
                "set",
                "  name_th = excluded.name_th,",
                "  name_en = excluded.name_en;",
                "",
                "commit;",
                "",
            ]
        ),
        encoding="utf-8",
    )


def write_districts_sql(path: Path, source_date: str, districts: list[tuple[int, int, str, str]]) -> None:
    values = ",\n".join(
        f"  ({district_id}, {province_id}, '{sql_escape(name_th)}', '{sql_escape(name_en)}')"
        for district_id, province_id, name_th, name_en in districts
    )
    path.write_text(
        "\n".join(
            [
                "-- Seed public.districts from official DOPA/BORA administrative data.",
                f"-- Source page: {OFFICIAL_SOURCE_PAGE}",
                f"-- Source file: {OFFICIAL_SOURCE_FILE}",
                f"-- Source workbook label: {source_date}",
                f"-- Expected active rows: {len(districts)} districts.",
                "",
                "begin;",
                "",
                "insert into public.districts (id, province_id, name_th, name_en)",
                "values",
                values,
                "on conflict (id) do update",
                "set",
                "  province_id = excluded.province_id,",
                "  name_th = excluded.name_th,",
                "  name_en = excluded.name_en;",
                "",
                "commit;",
                "",
            ]
        ),
        encoding="utf-8",
    )


def write_verify_sql(
    path: Path,
    provinces: list[tuple[int, str, str]],
    districts: list[tuple[int, int, str, str]],
) -> None:
    path.write_text(
        "\n".join(
            [
                "-- Verification queries for the Thailand location reference tables.",
                f"-- Expected province count: {len(provinces)}",
                f"-- Expected district count: {len(districts)}",
                "",
                "select count(*) as province_count from public.provinces;",
                "select count(*) as district_count from public.districts;",
                "",
                "select d.id, d.name_th",
                "from public.districts d",
                "left join public.provinces p on p.id = d.province_id",
                "where p.id is null;",
                "",
                "select count(*) as courts_missing_province_id",
                "from public.courts",
                "where province_id is null;",
                "",
                "select count(*) as courts_missing_district_id",
                "from public.courts",
                "where district_id is null;",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    source_path = Path(args.source)
    if not source_path.exists():
        raise FileNotFoundError(f"Source workbook not found: {source_path}")

    source_date, rows = iter_rows(source_path)
    provinces = build_provinces(rows)
    districts = build_districts(rows)

    if len(provinces) != 77:
        raise RuntimeError(f"Expected 77 active provinces, found {len(provinces)}")
    if len(districts) < 900:
        raise RuntimeError(f"Expected a full district set, found only {len(districts)} rows")

    provinces_out = Path(args.provinces_out)
    districts_out = Path(args.districts_out)
    verify_out = Path(args.verify_out)
    provinces_out.parent.mkdir(parents=True, exist_ok=True)
    districts_out.parent.mkdir(parents=True, exist_ok=True)
    verify_out.parent.mkdir(parents=True, exist_ok=True)

    write_provinces_sql(provinces_out, source_date, provinces)
    write_districts_sql(districts_out, source_date, districts)
    write_verify_sql(verify_out, provinces, districts)

    print(
        f"Generated {provinces_out} ({len(provinces)} provinces), "
        f"{districts_out} ({len(districts)} districts), and {verify_out}.",
        file=sys.stdout,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
