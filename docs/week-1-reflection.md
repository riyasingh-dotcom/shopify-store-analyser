# Week 1 Reflection

## What I Built

This week I built the foundation of the Shopify Intelligence platform by accessing Shopify Admin APIs through a Custom App, fetching store data, storing analysis history using Prisma and PostgreSQL, and generating AI-powered business insights. The application analyzes store health, identifies quick wins and high-priority issues, highlights trends such as high order value and high order count, and generates an overall store summary for merchants.

## Shopify Admin API

* **What was the biggest challenge?**
  I initially expected to access Shopify Admin API data through a normal Shopify app, but that approach did not provide the required access.

* **How did I solve it?**
  I created a Shopify Custom App, configured the required Admin API scopes, and successfully fetched store data.

* **What I learned:**
  Shopify app type and permissions are critical. Understanding API scopes is necessary before building analytics features.

## Prisma & PostgreSQL

* **What did I use them for?**
  I used Prisma and PostgreSQL to store AI analysis results and maintain analysis history.

* **Why was history important?**
  Instead of generating completely new analysis every time, the application could reference previous analysis records and maintain context over time.

* **What I learned:**
  I learned how to model data with Prisma, persist records, and retrieve historical data efficiently.

## AI Analysis

* **What was the goal?**
  Convert Shopify store data into actionable business insights.

* **Insights generated:**

  * Store Health
  * Quick Wins
  * High Priority Issues
  * High Order Value Analysis
  * High Order Count Analysis
  * Overall Store Summary

* **What AI provider did I use?**
  Groq was used instead of Anthropic for generating insights.

## Optimization

* **What optimization did I implement?**
  I stored analysis history in the database and reused previous analysis context when generating new insights.

* **Benefits:**

  * Reduced API usage
  * Faster responses
  * More contextual recommendations
  * Better continuity between analyses

## Key Learnings

* Understanding Shopify app permissions is essential before accessing Admin APIs.
* Prisma simplifies database operations while keeping the application type-safe.
* AI-generated insights become more useful when historical context is included.
* Persisting analysis results can improve both performance and user experience.

## Daily Flag Document

* **Was filling it in daily useful?**
  Yes. It helped me track progress, document learnings, and identify blockers.

* **Did it change how you worked through the day?**
  Yes. It encouraged me to focus on measurable outcomes and reflect on implementation decisions rather than only completing tasks.
