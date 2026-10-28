import { buildServer } from "./app";

const port = Number(process.env.PORT ?? 3000);
buildServer().listen(port, () => console.log(`api listening on http://localhost:${port}`));
