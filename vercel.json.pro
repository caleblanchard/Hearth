{
  "crons": [
    {
      "path": "/api/cron/generate-chore-instances",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/distribute-allowances",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/sync-external-calendars",
      "schedule": "0 * * * *"
    }
  ]
}
