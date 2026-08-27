import { ProMovieGuard } from "@/components/ProMovieGuard";
import { CatalogBrowse } from "./CatalogBrowse";
export default function Dramas() { return <ProMovieGuard><CatalogBrowse type="drama" /></ProMovieGuard>; }
