# Week 3 Reflection

## What I Built

This week I built an Orders Intelligence Dashboard that retrieves Shopify order data, calculates business metrics, and visualizes revenue, customer behavior, order status distribution, and top-performing products. I also integrated Claude-powered order analysis to generate actionable business insights from aggregated metrics and added database persistence to store analysis results. Finally, I Dockerized the application and configured Prisma to run correctly in a production container environment.

## Orders API vs Products API

* **What was harder about orders data compared to products:**
  Orders data is significantly more complex because it contains nested relationships between orders, line items, customers, fulfillment status, and financial information. Building analytics required flattening and aggregating data across multiple levels.

* **The money-as-string issue — did I catch it before or after a bug?**
  I encountered it while implementing calculations and realized values needed to be converted before performing revenue and metrics computations. This reinforced the importance of validating API data types.

* **What I now understand about Shopify's financial data model:**
  Shopify exposes monetary values as structured money objects rather than plain numbers. Revenue-related calculations often require extracting values from nested fields and carefully handling currency-aware amounts before aggregation.

## Docker — Understanding Check

* **What is a multi-stage Docker build and why does it matter?**
  A multi-stage build separates the build environment from the runtime environment. Dependencies and build tools are used in earlier stages, while only the necessary application artifacts are copied into the final image, resulting in smaller and more secure containers.

* **What does `output: 'standalone'` do in Next.js config?**
  It creates a self-contained production build that includes only the files and dependencies required to run the application, making deployment and Dockerization easier.

* **What would happen if I removed the `.dockerignore` file?**
  Docker would send unnecessary files such as node_modules, local build artifacts, logs, and development files into the build context, increasing build time and image size.

* **Why does the app run as a non-root user?**
  Running as a non-root user follows security best practices by limiting permissions inside the container and reducing the impact of potential vulnerabilities.

## Claude Prompt Experiment (Orders Analysis)

* **Weak system prompt result (summarise the topPriority output):**
  The analysis was generic, repeated metrics, and provided broad business advice without clearly connecting recommendations to the supplied data.

* **Strong system prompt result (summarise the topPriority output):**
  The analysis highlighted specific trends in revenue, fulfillment, customer quality, and product performance, while providing actionable recommendations tied directly to the metrics.

* **What specifically made the difference:**
  Explicit instructions, structured output categories, business-focused reasoning, and directing Claude to analyze metrics rather than restate them produced significantly better results.

## Daily Flag Document

* **Was filling it in daily useful? Why or why not?**
  Yes. It helped me reflect on what I actually completed each day, identify blockers, and track progress more objectively rather than relying on memory.

* **Did it change how you worked through the day?**
  Yes. Knowing I would need to document outcomes encouraged me to focus on completing measurable deliverables, verify my work, and pay closer attention to challenges and learnings.
