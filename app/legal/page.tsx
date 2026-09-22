import { LegalPage } from "./LegalPage";
export default function Legal() { return <LegalPage title="Legal and demo information" sections={[
  ["Current product status", "Arivvio is a pre-beta demonstration of event planning, Marketplace discovery, saved requests and vendor business tools. Simulated customer and vendor actions are labeled as demo actions. No real booking, vendor communication, payment, invitation delivery or fulfillment is provided by those actions."],
  ["Privacy and terms", "The Privacy Policy describes current browser-local and account-related data handling. The Terms of Use describe the demonstration and its limitations. Both are starter documents for the current product, not a claim of attorney-reviewed compliance."],
  ["Questions or concerns", "Use Contact Arivvio to raise product, privacy, content ownership or other concerns. Include the relevant page and a brief explanation. Do not include passwords, financial details or private guest information."]
]} />; }
