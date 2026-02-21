import { FC } from "hono/jsx";

export const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=1080, height=1920" />
        <title>Home Dashboard</title>
        <link rel="stylesheet" href="/src/style.css" />
        {import.meta.env.PROD ? (
          <script type="module" src="/static/client.js" />
        ) : (
          <script type="module" src="/src/client.tsx" />
        )}
      </head>
      <body class="bg-neutral-900 text-white min-h-screen">{props.children}</body>
    </html>
  );
};
