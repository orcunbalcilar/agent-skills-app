// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/api/v1/:path*"],
};
