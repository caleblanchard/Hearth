# Cloud Migration - Phase 0 Checklist

**Before writing ANY migration code, complete this checklist.**

## Week 1: Baseline Documentation

### Database Backup
- [ ] Create full database backup
  ```bash
  pg_dump $DATABASE_URL > backups/pre-migration-$(date +%Y%m%d).sql
  ```
- [ ] Test restore from backup
  ```bash
  # In test environment
  pg_restore -d test_db backups/pre-migration-*.sql
  ```
- [ ] Verify restored data integrity

### Test Baseline
- [ ] Run full test suite
  ```bash
  npm test -- --coverage --json > baseline-tests.json
  ```
- [ ] Document test results
  - Total tests: _______
  - Passing: _______
  - Coverage: _______%
- [ ] All tests passing? ☐ Yes ☐ No (fix before proceeding)

### Performance Baseline
- [ ] Create benchmark script (see Section 15)
- [ ] Benchmark all critical endpoints
  ```bash
  npm run benchmark:api > baseline-performance.txt
  ```
- [ ] Document current metrics:
  - GET /api/families - p95: _____ ms
  - GET /api/chores - p95: _____ ms
  - POST /api/chores - p95: _____ ms
  - GET /api/meals - p95: _____ ms

### Code State
- [ ] Tag current state
  ```bash
  git tag pre-supabase-migration
  git push origin pre-supabase-migration
  ```
- [ ] Create backup branch
  ```bash
  git checkout -b backup/before-migration
  git push origin backup/before-migration
  ```

### Documentation
- [ ] Document all current auth flows (screenshots)
- [ ] Document current error rates
- [ ] Document current user feedback/complaints

## Week 2-3: Proof of Concept

### Setup
- [ ] Create Supabase dev project
  ```bash
  supabase init
  supabase start
  ```
- [ ] Install dependencies (keep Prisma!)
  ```bash
  npm install @supabase/ssr @supabase/supabase-js
  ```

### Test Infrastructure
- [ ] Create `lib/test-utils/supabase-mock.ts`
- [ ] Create `lib/test-utils/supabase-auth-mock.ts`
- [ ] Create `lib/test-utils/rls-test-helpers.ts`
- [ ] Write example tests using mocks
- [ ] Validate mocks work correctly

### POC Module: Weather
- [ ] Choose simple module (weather recommended)
- [ ] Write Supabase tests FIRST
- [ ] Tests failing (Red phase)
- [ ] Implement Supabase queries
- [ ] Tests passing (Green phase)
- [ ] Refactor code
- [ ] Benchmark performance vs Prisma
- [ ] Document lessons learned

### POC Results
- [ ] Performance comparison:
  - Prisma: _____ ms
  - Supabase: _____ ms
  - Difference: _____ % (target: within 20%)
- [ ] Tests passing? ☐ Yes ☐ No
- [ ] Team comfortable with approach? ☐ Yes ☐ No
- [ ] Any blockers identified? ☐ No ☐ Yes: _______

## Decision Point: GO/NO-GO

### Go Criteria (ALL must be YES)
- [ ] POC tests passing with Supabase mocks
- [ ] Performance acceptable (within 20% of Prisma)
- [ ] Team trained and comfortable with new patterns
- [ ] Test utilities validated and working
- [ ] No critical blockers identified
- [ ] Stakeholder approval for 12-16 week timeline
- [ ] Team capacity available (3-4 months focused work)

### Deployment Strategy Decision
Choose ONE:
- [ ] **Cloud-only** (Vercel + Supabase) - Recommended, simpler
- [ ] **Self-hosted only** (Docker + PostgreSQL) - Keep existing
- [ ] **Dual mode** (Both) - Adds 6-8 weeks complexity

### Final Approval
- [ ] Architecture reviewed by team
- [ ] Timeline approved by stakeholders
- [ ] Risk assessment reviewed
- [ ] Rollback plan understood
- [ ] Go-ahead given to proceed

## If NO-GO

### Document Decision
- [ ] Why was migration deferred?
- [ ] What needs to change for future consideration?
- [ ] When should we revisit this decision?
- [ ] What's our alternative approach?

### Cleanup
- [ ] Remove Supabase dependencies
  ```bash
  npm uninstall @supabase/ssr @supabase/supabase-js
  ```
- [ ] Archive POC branch
  ```bash
  git checkout -b archive/supabase-poc
  git push origin archive/supabase-poc
  ```
- [ ] Focus on current stack improvements

---

## If GO - Next Steps

Proceed to **Phase 1** of the migration plan (Section 10):
1. Build complete test infrastructure (Weeks 4-5)
2. Schema migration (Week 6)
3. Dual-write period (Weeks 7-9)
4. Auth migration (Weeks 10-11)
5. Data layer migration (Weeks 12-14)
6. RLS implementation (Week 15)
7. Kiosk migration (Week 15-16)
8. Cutover & cleanup (Week 16+)

**Remember:** Follow TDD throughout. Never remove working code until replacement is proven stable.

---

**Reference Documents:**
- Full Design: `/docs/CLOUD_DEPLOYMENT_PLAN.md`
- Review Summary: `/CLOUD_MIGRATION_REVIEW.md`

**Completed:** ☐ Week 1 ☐ Week 2-3 ☐ GO Decision Made
