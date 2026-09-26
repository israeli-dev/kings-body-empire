import "./globals.css";

export const metadata = {
  title: "Kings Body Empire",
  description: "Train. Eat. Track. Transform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
