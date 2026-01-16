[Vercel](https://vercel.com/)Slash[next-forge](/en)

* [Docs](/en/docs)
* [Source](https://github.com/vercel/next-forge/)

Search...`⌘K`Ask AI

Ask AI

Introduction

[Overview](/docs)[Philosophy](/docs/philosophy)[Structure](/docs/structure)[Updates](/docs/updates)[FAQ](/docs/faq)

Usage

Setup

Apps

Packages

Deployment

Other

Addons

Examples

Migrations

On this page

# Metabase

How to add business intelligence and analytics to your app with Metabase.

While next-forge doesn't include BI tooling out of the box, you can easily add business intelligence and analytics to your app with [Metabase](https://www.metabase.com).

Try it locally or in the cloud:

[![Self-host Metabase](https://img.shields.io/badge/Self--host-Metabase-blue?logo=metabase)](https://www.metabase.com/start/oss)[![Try Metabase Cloud](https://img.shields.io/badge/Try%20Cloud-Metabase-brightgreen?logo=metabase)](https://metabase.com/start)

## [Overview](#overview)

Metabase is an open-source business intelligence platform. You can use Metabase to ask questions about your data, or embed Metabase in your app to let your customers explore their data on their own.

## [Installing Metabase](#installing-metabase)

Metabase provides an official Docker image via Docker Hub that can be used for deployments on any system that is running Docker. Here's a one-liner that will start a container running Metabase:

```
docker run -d --name metabase -p 3000:3000 metabase/metabase
```

For full installation instructions:

* [Docker Documentation](https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker)
* [Jar File Documentation](https://www.metabase.com/docs/latest/installation-and-operation/running-the-metabase-jar-file)

## [Database Connection](#database-connection)

By default, next-forge uses Neon as its database provider. Metabase works seamlessly with Postgres. To connect, you'll need:

* The `hostname` of the server where your database lives
* The `port` the database server uses
* The `database name`
* The `username` you use for the database
* The `password` you use for the database

You can find these details in your `DATABASE_URL`:

```
DATABASE_URL="postgresql://[username]:[password]@[hostname]:[port]/[database_name]?sslmode=require"
```

Then plug your database connection credentials into Metabase:

![/images/metabase-add-database.png](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fmetabase-add-database.43ab3e9b.png&w=3840&q=75&dpl=dpl_GNYDMquaXuMtnLzfKfMsTquZJvC1)

Metabase supports over 20 databases. For other database options, see [Metabase Database Documentation](https://www.metabase.com/docs/latest/databases/connecting).

## [Asking Questions and Building Dashboards](#asking-questions-and-building-dashboards)

Once connected, you can start asking [Questions](https://www.metabase.com/docs/latest/questions/query-builder/introduction) and building [Dashboards](https://www.metabase.com/docs/latest/dashboards/introduction).

### On this page

[Overview](#overview)[Installing Metabase](#installing-metabase)[Database Connection](#database-connection)[Asking Questions and Building Dashboards](#asking-questions-and-building-dashboards)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/metabase.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)