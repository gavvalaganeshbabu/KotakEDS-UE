# CC Steps

"Apply online in 3 simple steps" — a heading, sub-heading, a row of step cards
(icon + title + description), and a CTA button. Container + repeatable step items.

## Authoring fields (Universal Editor)

**CC Steps (container)**

| Field | Type | Notes |
|-------|------|-------|
| Heading | text | Section title |
| Sub-heading | text | Supporting line |
| CTA Link | aem-content | Button target |
| CTA Text | text | Button label |

**Step (item)**

| Field | Type | Notes |
|-------|------|-------|
| Icon | reference | Step icon (DAM) |
| Icon Alt Text | text | Accessible alt |
| Step Title | text | e.g. "Select your ideal card" |
| Step Description | richtext | Short supporting copy |

## Variations

None. A dark/alt-background variant would be a space-separated modifier
(`cc-steps cc-steps-dark`) rather than a new block.

## Responsive behaviour

- **Mobile (base):** step cards stacked in a single column, centered.
- **Desktop (≥900px):** 3-column row, left-aligned cards, with a subtle
  navy→red connector line behind them.

## da.live authoring sample

```
+---------------------------------------------------+
| CC Steps                                          |
+---------------------------------------------------+
| Apply online in 3 simple steps                    |
+---------------------------------------------------+
| Keep PAN, Aadhaar, and mobile number ready...     |
+---------------------------------------------------+
| [Check Eligibility](/en/.../eligibility)          |
+---------------------------------------------------+
| Check Eligibility                                 |
+---------------------------------------------------+

+---------------------------------------------------+
| Step                                              |
+---------------------------------------------------+
| ![Card](/content/dam/kotak/credit-cards/steps/select-card.svg) |
+---------------------------------------------------+
| Select your ideal card                            |
+---------------------------------------------------+
| Find the credit card that fits your lifestyle.    |
+---------------------------------------------------+
```
(Repeat the Step table for each of the 3 steps.)

## DAM assets required

| Asset | Proposed DAM path | Alt text |
|-------|-------------------|----------|
| Select-card icon | `/content/dam/kotak/credit-cards/steps/select-card.svg` | Select your ideal card |
| Share-details icon | `/content/dam/kotak/credit-cards/steps/share-details.svg` | Share basic details |
| VKYC icon | `/content/dam/kotak/credit-cards/steps/complete-vkyc.svg` | Complete VKYC |
