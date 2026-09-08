# Workforce Compass

# Enterprise SaaS Foundation & Project Architecture

You are an expert team of Enterprise Software Architects, Senior Full Stack Engineers, UI/UX Designers, Database Architects, DevOps Engineers, and Security Engineers.

Your task is to build the FOUNDATION of a production-ready enterprise SaaS platform.

Do NOT build GitHub, Jira, ClickUp, Excel Upload, Analytics, AI Scoring, or Reports yet.

This prompt is ONLY responsible for creating the complete project architecture and foundation that future prompts will extend.

====================================================

PROJECT NAME

TalentAI Enterprise

Tagline:

AI Powered Workforce Intelligence Platform

====================================================

MISSION

Build an enterprise-grade workforce intelligence platform that allows organizations to analyze employee productivity, engineering performance, project execution, and collaboration by integrating multiple platforms.

Future modules will include:

• GitHub

• Jira

• ClickUp

• Excel Upload

• AI Employee Scoring

• Dashboards

• Reports

• Notifications

Do NOT implement those modules yet.

Only prepare the application for them.

====================================================

TECH STACK

Frontend

• React 19

• TypeScript

• Vite

• TailwindCSS

• shadcn/ui

• React Query

• React Hook Form

• Zod

• Framer Motion

• Recharts

• Lucide Icons

Backend

• Supabase

Database

• PostgreSQL

Authentication

• Supabase Auth

Deployment

Frontend:

Vercel

Backend:

Supabase

====================================================

PROJECT ARCHITECTURE

Create a clean enterprise architecture.

Use feature-based architecture instead of component dumping.

Create folders similar to:

src/

app/

components/

features/

pages/

hooks/

contexts/

services/

lib/

utils/

types/

config/

assets/

styles/

providers/

layouts/

constants/

api/

routes/

====================================================

FEATURE FOLDER STRUCTURE

Create empty feature modules for future development.

Employees

GitHub

Jira

ClickUp

Excel Upload

AI Engine

Reports

Notifications

Analytics

Dashboard

Settings

Organization

Teams

Departments

Projects

Audit Logs

Administration

Each feature must have

components

pages

hooks

types

services

api

====================================================

LAYOUT

Create a professional SaaS layout.

Desktop

Tablet

Mobile

Include

Responsive Sidebar

Top Navigation

Breadcrumb

Notification Bell

Search Bar

Profile Menu

Theme Toggle

Organization Switcher

====================================================

SIDEBAR

Create navigation placeholders only.

Dashboard

Employees

Teams

Departments

Projects

GitHub

Jira

ClickUp

Excel Upload

Analytics

Reports

Notifications

Settings

Administration

Each item should have an icon.

====================================================

TOP NAVBAR

Include

Global Search

Notifications

Theme Switch

Profile Avatar

Organization Selector

User Role Badge

====================================================

THEME

Create modern enterprise UI.

Requirements

Professional

Minimal

Clean

Premium

Rounded cards

Soft shadows

Proper spacing

Consistent typography

Dark Mode

Light Mode

Use CSS variables for colors.

====================================================

DESIGN SYSTEM

Create reusable UI components.

Button

Input

Textarea

Card

Table

Badge

Modal

Dialog

Tabs

Dropdown

Avatar

Pagination

Alert

Toast

Empty State

Loading Skeleton

Spinner

====================================================

STATE MANAGEMENT

Use

React Query

Context API

Custom Hooks

Prepare providers for future modules.

====================================================

ROUTING

Create application routes.

Dashboard

Employees

Teams

Departments

Projects

GitHub

Jira

ClickUp

Excel Upload

Analytics

Reports

Notifications

Settings

Administration

All pages should exist as placeholders.

====================================================

ERROR HANDLING

Create

404 Page

Unauthorized Page

Server Error Page

Maintenance Page

====================================================

LOADING EXPERIENCE

Skeleton Loaders

Loading Spinners

Progress Bars

Suspense Boundaries

====================================================

FORM SYSTEM

Use

React Hook Form

Zod Validation

Reusable form components

====================================================

NOTIFICATION SYSTEM

Create reusable notification framework.

Do NOT integrate any APIs yet.

Prepare

Success

Warning

Info

Error

Toast system

====================================================

API LAYER

Create reusable API service architecture.

Prepare folders for

GitHub

Jira

ClickUp

Supabase

Future APIs

Do NOT implement integrations yet.

====================================================

SUPABASE

Connect project with Supabase.

Create configuration only.

Prepare authentication layer.

Prepare database service layer.

Prepare storage service layer.

Do NOT create database tables yet.

====================================================

SECURITY

Prepare

Protected Routes

Role Guards

Permission Guards

Secure API Layer

Environment Variable Management

====================================================

CONFIGURATION

Create

App Config

Route Config

Navigation Config

Theme Config

API Config

====================================================

RESPONSIVENESS

Desktop

Laptop

Tablet

Mobile

Everything must work correctly.

====================================================

ACCESSIBILITY

Use semantic HTML.

Keyboard navigation.

ARIA labels.

Focus states.

Accessible forms.

====================================================

PERFORMANCE

Lazy Loading

Code Splitting

Memoization

Optimized Imports

Image Optimization

====================================================

CODE QUALITY

Use

Strict TypeScript

Reusable Components

Clean Code

SOLID Principles

No duplicated code

Proper naming conventions

====================================================

DELIVERABLE

Generate a production-ready SaaS foundation.

The project should compile successfully without errors.

Every page should be connected.

Every navigation item should work.

Every placeholder page should be responsive.

The architecture should be scalable for future enterprise modules.

Do NOT build GitHub, Jira, ClickUp, Excel Upload, Analytics, AI Engine, or Reports in this prompt.

Only create the complete enterprise project foundation that future prompts will extend.

The output must follow enterprise software engineering standards and be ready for production-scale development.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e6e9483-225e-4d34-a532-82abef8f1c7f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
