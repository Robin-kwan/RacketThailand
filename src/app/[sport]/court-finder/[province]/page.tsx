import { LocationDiscoveryPage, locationMetadata, type LocationPageProps } from "@/components/location-discovery-page";

export function generateMetadata(props: LocationPageProps) {
  return locationMetadata(props, "courts");
}

export default function Page(props: LocationPageProps) {
  return <LocationDiscoveryPage {...props} kind="courts" />;
}
