# Week 2 Reflection

## What I Built

This week I built a Product SEO Audit system that fetches product data from Shopify, evaluates products against SEO criteria, generates audit scores, and stores the results in the database. I also integrated AI-powered product analysis to generate improved titles, descriptions, and tags based on audit results. Additionally, I implemented audit history tracking, AI analysis history, and bulk analysis capabilities to improve usability and reduce API consumption.

## Products API — Understanding Check

* **What was challenging about product data?**
  Product data required combining information from multiple fields such as titles, descriptions, tags, images, and metadata to generate meaningful SEO insights. Unlike simple data retrieval, the challenge was converting product information into actionable recommendations.

* **What I learned about SEO auditing:**
  SEO quality cannot be determined by a single metric. A useful audit considers title quality, description completeness, keyword relevance, image presence, tag usage, and overall content optimization.

* **What I now understand about building AI-powered features:**
  The quality of AI output depends heavily on the context provided. Supplying structured audit results produced more relevant recommendations than sending raw product data alone.

## Database Persistence

* **Why store audit scores in the database?**
  Storing audit scores creates a historical record of product quality and allows users to track improvements over time without recalculating previous audits.

* **Why store AI analysis results?**
  AI analysis can be expensive and rate-limited. Persisting results avoids unnecessary API calls and gives users access to previous recommendations.

* **What benefits did history tracking provide?**
  Users can compare previous recommendations, understand how products have evolved, and revisit older analyses without regenerating them.

## AI Analysis Improvements

* **Original approach:**
  Generate SEO recommendations directly from the current product data and audit results.

* **Improved approach I implemented:**
  Before generating a new analysis, retrieve the most recent audit score and historical analysis from the database and provide that context to the AI model.

* **Why this improved results:**
  The AI could evaluate progress over time and generate recommendations based on previous performance rather than treating each analysis as an isolated request. This produced more accurate and contextual suggestions.

## Bulk Analysis Feature

* **What problem was being solved?**
  Running AI analysis individually for many products would consume API credits quickly and create unnecessary requests.

* **What I implemented:**
  Added support for bulk analysis of up to 5 products in a single operation.

* **Benefits:**

  * Reduced API usage.
  * Faster user workflow.
  * Improved scalability.
  * Better resource utilization.

## Prompt Engineering Experiment

* **Weak prompt result:**
  The AI generated generic SEO advice that could apply to almost any product and often lacked specific recommendations.

* **Strong prompt result:**
  The AI generated targeted title improvements, description enhancements, keyword suggestions, and tag recommendations that directly reflected the product's current SEO score and audit findings.

* **What specifically made the difference:**
  Providing structured audit data, previous audit history, and clear output requirements significantly improved the relevance and usefulness of the recommendations.

## Daily Flag Document

* **Was filling it in daily useful? Why or why not?**
  Yes. It helped me track feature completion, document implementation decisions, and identify where additional improvements could be made.

* **Did it change how you worked through the day?**
  Yes. It encouraged me to think about long-term maintainability, measure progress more clearly, and justify technical decisions rather than simply completing tasks.
