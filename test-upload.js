import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

async function test() {
  const form = new FormData();
  form.append('image', fs.readFileSync("package.json"), "package.json"); // Just dummy file

  const res = await fetch("http://localhost:5173/api/admin/avatars/test-id", {
    method: "PUT",
    headers: {
      "x-api-key": process.env.VITE_APP_API_KEY || "sagacitas-gamification-admin-secure-2026",
    },
    body: form
  });
  console.log(res.status, await res.text());
}
test();
