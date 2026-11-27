import { LocationDiscoveryPage, locationMetadata, type LocationPageProps } from "@/components/location-discovery-page";

export function generateMetadata(props: LocationPageProps) {
  return locationMetadata(props, "groups");
}

export default function Page(props: LocationPageProps) {
  return <LocationDiscoveryPage {...props} kind="groups" />;
}
