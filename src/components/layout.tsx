import { FC } from "hono/jsx";
import { raw } from "hono/html";

export const Layout: FC = (props) => {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920" />
          <title>Home Dashboard</title>
          <link rel="stylesheet" href="/static/style.css" />
          <script type="module" src="/static/client.js" />
        </head>
        <body class="bg-neutral-900 text-white min-h-screen">
          {props.children}
          <div id="refresher-root" />
        </body>
      </html>
    </>
  );
};
