/**
 * Numeric size charts for the clothing blanks we sell (WCAG re-audit N07,
 * 2026-09-17). Fourthwall's product data only carries the "how to measure"
 * diagram and text, never the numbers, and sizing returns aren't accepted, so
 * the measurements live here.
 *
 * Numbers are the garment measurements Printful publishes for each blank
 * (api.printful.com/products/<id>/sizes, pulled 2026-09-17). Each chart is
 * matched by the product's size-guide image, which is the same for every
 * product on that blank, so a new tee or hoodie on the same blank picks its
 * chart up automatically. A product whose guide doesn't match shows no table.
 */

export interface SizeChart {
  /** Supplier and style, for our own reference. */
  blank: string;
  columns: { label: string; hint: string }[];
  rows: { size: string; values: string[] }[];
  note?: string;
  /** Care lines shown as a "Care" section on the product page (Jose 9/26).
   *  Fourthwall's API can't edit product text, so the site adds it per blank. */
  care: string[];
}

/** Approved 2026-09-26. Every printed tee and hoodie is DTG. */
const CARE =
  "Treat it like you treat your rig. Turn it inside out, wash cold, tumble dry low (or hang it), and keep the iron and bleach away from the print. It'll look good for a lot of trail days.";
// Parents reviewing these blanks mention a new-ink smell.
const CARE_LITTLE = [CARE, "Wash before first wear."];

const LENGTH = { label: "Length", hint: "Top of the shoulder by the collar, down to the hem" };
const WIDTH = { label: "Width", hint: "Across the chest, armpit seam to armpit seam, laid flat" };
const SLEEVE = { label: "Sleeve", hint: "Top of the sleeve seam down to the cuff" };

const CHARTS: { match: string; chart: SizeChart }[] = [
  {
    // Earn It, Protect the Culture, Road & Trail, Split Terrain, Open Road Podcast,
    // Behind the Mic, Roadside Stories tees
    match: "e5caf6d7bf3c175ea08bcebbeaa23e45",
    chart: {
      blank: "Comfort Colors 1717 (Printful 586)",
      columns: [LENGTH, WIDTH, SLEEVE],
      rows: [
        { size: "S", values: ["26.63", "18.25", "16.25"] },
        { size: "M", values: ["28", "20.25", "17.75"] },
        { size: "L", values: ["29.38", "22", "19"] },
        { size: "XL", values: ["30.75", "24", "20.5"] },
        { size: "2XL", values: ["31.63", "26", "21.75"] },
        { size: "3XL", values: ["32.5", "27.75", "23.25"] },
        { size: "4XL", values: ["33.5", "29.75", "24.63"] },
      ],
      care: [CARE],
    },
  },
  {
    // Earn It, Protect the Culture, After Hours, Trailhead, Open Road Podcast,
    // Roadside Stories, Behind the Mic hoodies
    match: "9dbc1c840b00d6c6627be881f542bcdf",
    chart: {
      blank: "Cotton Heritage M2580 (Printful 380)",
      columns: [LENGTH, WIDTH],
      rows: [
        { size: "S", values: ["27", "20"] },
        { size: "M", values: ["28", "21"] },
        { size: "L", values: ["29", "23"] },
        { size: "XL", values: ["30", "25"] },
        { size: "2XL", values: ["31", "26.5"] },
        { size: "3XL", values: ["32", "28"] },
      ],
      note: "The supplier says this hoodie runs small. For a looser fit, go one size up.",
      care: [CARE],
    },
  },
  {
    // Next Generation Heavyweight Tee (youth). Its guide image is hosted by
    // Fourthwall, not Printful.
    match: "bb10d54b-adf0-491c-b957-0d3dced47d41",
    chart: {
      blank: "Comfort Colors 9018 youth (Printful 1485)",
      columns: [LENGTH, WIDTH, SLEEVE],
      rows: [
        { size: "XS", values: ["18.75", "13.5", "11.5"] },
        { size: "S", values: ["20.5", "14.5", "12.5"] },
        { size: "M", values: ["21.5", "16.5", "13.5"] },
        { size: "L", values: ["22.75", "17.5", "14.5"] },
        { size: "XL", values: ["26", "19.5", "15.5"] },
      ],
      care: [CARE],
    },
  },
  {
    // Next Generation Hoodie (youth)
    match: "5fcf040f982749e7ac62f5e5053fa926",
    chart: {
      blank: "Comfort Colors 1467Y youth (Printful 1411)",
      columns: [LENGTH, WIDTH, SLEEVE],
      rows: [
        { size: "XS", values: ["17.5", "14", "21.25"] },
        { size: "S", values: ["20", "15.5", "23.25"] },
        { size: "M", values: ["21", "17.5", "26"] },
        { size: "L", values: ["23", "18.5", "29.25"] },
        { size: "XL", values: ["25", "20", "32.5"] },
      ],
      care: [CARE],
    },
  },
  {
    // Little Crawlers Trail Tee (toddler)
    match: "9ccab2848166eb5e394383b13924cbe7",
    chart: {
      blank: "Bella + Canvas 3001T (Printful 306)",
      columns: [LENGTH, WIDTH],
      rows: [
        { size: "2T", values: ["15.5", "12"] },
        { size: "3T", values: ["16.5", "13"] },
        { size: "4T", values: ["17.5", "14"] },
        { size: "5T", values: ["18.5", "15"] },
      ],
      care: CARE_LITTLE,
    },
  },
  {
    // First Crawl Bodysuit (baby). Printful lists no 6M measurements.
    match: "36b7d6e8845efa53c6742266aab91a9a",
    chart: {
      blank: "Rabbit Skins 4400 (Printful 234)",
      columns: [LENGTH, WIDTH],
      rows: [
        { size: "12M", values: ["13.5", "9.75"] },
        { size: "18M", values: ["14.5", "10.75"] },
        { size: "24M", values: ["15.5", "11.75"] },
      ],
      note: "The supplier doesn't publish 6M measurements. It's one size smaller than 12M.",
      care: CARE_LITTLE,
    },
  },
];

export function sizeChartFor(guideImageUrl: string | null | undefined): SizeChart | null {
  if (!guideImageUrl) return null;
  return CHARTS.find((c) => guideImageUrl.includes(c.match))?.chart ?? null;
}
