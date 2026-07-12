"use client";

import { useEffect } from "react";
import { syncTimezone } from "./actions";

export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void syncTimezone(tz);
  }, []);

  return null;
}
