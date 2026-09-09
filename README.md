# The Polite Scraper (FlyRank W5 · Assignment A9)

A respectful, resilient, and production-ready web scraping pipeline built in **Node.js (JavaScript lane)**. It crawls the first three catalogue pages of [Books to Scrape](https://books.toscrape.com), extracts 60 book detail pages, normalizes messy HTML into typed and schema-validated JSON records, survives broken pages without crashing, and ends every run with an honest audit report.

---

## 🎯 Target Classification (Stage 0)

| Classification Item | Details |
| :--- | :--- |
| **Target Website** | [Books to Scrape](https://books.toscrape.com/) (`https://books.toscrape.com/`) |
| **Purpose & Permission** | Built and hosted by Zyte specifically as an open sandbox for developers and students learning web scraping. The homepage explicitly states: <br> *"A fictional bookstore that desperately wants to be scraped. It's a safe place for beginners learning web scraping and for developers validating their scraping technologies as well."* |
| **Extraction Scope** | The first **3 catalogue pages** only (20 books per page = 60 books total) and their corresponding detail pages. |
| **Data Collected** | Product title, canonical product URL, raw price text, normalized price (`price_gbp` float), availability status, star rating, product description (or `null` if absent), and provenance metadata (`source_page` catalogue link and `fetched_at` ISO-8601 timestamp). |
| **Robots.txt Analysis** | Requesting `https://books.toscrape.com/robots.txt` returned **HTTP 404 (no robots file found)**. In professional web scraping, a missing robots file is never assumed to be carte blanche permission; permission is verified via the sandbox terms. |
| **Appropriateness** | Scraping this target within this constrained three-page boundary is ethical and appropriate because the domain was created explicitly for scraping experimentation, contains no copyrighted personal data or paywalls, and our pipeline introduces deliberate rate delays (`>= 500ms`), custom identification headers, and local caching to minimize server traffic. |

> **Ethical Commitment:**  
> *"I will not reuse this code on another site without checking its rules and terms first."*

---

## 🚀 Quickstart & Installation

### Requirements
- **Node.js**: v20.0.0+ (Tested on Node.js v24.11.0)
- **npm**: v10.0.0+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Polite Scraper
```bash
npm start
```

### 3. Run with Simulated Failure (Stage 5 Verification)
```bash
npm run scrape:test-failure
```

### 4. Run Unit Tests (Fixtures & Parser Rules)
```bash
npm test
```
