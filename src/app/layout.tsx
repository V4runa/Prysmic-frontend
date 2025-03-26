
import "./globals.css";

export const metadata = {
  title: 'AI Notes',
  description: 'Your smart note-taking assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
