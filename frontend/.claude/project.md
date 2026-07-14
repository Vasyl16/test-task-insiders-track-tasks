# Project Overview

This document describes the frontend of the task tracker project.

## Project Summary
The frontend is a React + TypeScript single-page app, built incrementally with Vite and Tailwind CSS, consuming the task tracker backend's REST API (JWT-based authentication with access + refresh tokens).

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- Axios, a query/cache library, and React Router (planned — see `CLAUDE.md`)

## Project Goals
- Build a maintainable frontend for the task tracker.
- Deliver the current milestone, V1 Authentication UI, before moving to later versions.
- Keep the API layer (Axios instance, queries, mutations) cleanly separated from UI components.
