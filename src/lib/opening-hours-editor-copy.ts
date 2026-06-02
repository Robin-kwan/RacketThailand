type TranslationGetter = (key: string) => string;

export function buildOpeningHoursEditorCopy(t: TranslationGetter) {
  return {
    dayLabels: {
      monday: t("groups.days.monday"),
      tuesday: t("groups.days.tuesday"),
      wednesday: t("groups.days.wednesday"),
      thursday: t("groups.days.thursday"),
      friday: t("groups.days.friday"),
      saturday: t("groups.days.saturday"),
      sunday: t("groups.days.sunday"),
    },
    addHours: t("admin.openingHoursEditor.addHours"),
    alwaysOpen: t("admin.openingHoursEditor.alwaysOpen"),
    closed: t("admin.openingHoursEditor.closed"),
    openTime: t("admin.openingHoursEditor.openTime"),
    closeTime: t("admin.openingHoursEditor.closeTime"),
    remove: t("admin.openingHoursEditor.remove"),
  };
}
