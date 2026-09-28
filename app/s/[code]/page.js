import ShortRedirect from "./ShortRedirect";

export default async function ShortLinkPage({ params }) {
  const { code } = await params;
  return <ShortRedirect code={code} />;
}