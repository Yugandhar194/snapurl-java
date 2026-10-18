import FileShare from "./FileShare";

export const metadata = {
  title: "Secure File Share — SnapURL",
  description: "Share a file with a password-protected, browser-encrypted download link.",
};

export default function FileSharePage() {
  return <FileShare />;
}