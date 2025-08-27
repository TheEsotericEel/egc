import type { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "Calculator | __REPLACE_ME::APP_NAME__",
  description: "__REPLACE_ME::META_DESCRIPTION__",
};

export default function Page() {
  // Server component. Renders the client-only calculator wrapper.
  return <CalculatorClient />;
}





