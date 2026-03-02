# Sample Data Journey Log

Issues and improvements found during Playwright journey runs.
Generated: 2026-03-02


## Journey 1: Visualizer Lead (Margaret Wilson)

- **[FATAL]** Journey 1 failed: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid="concept-thumbnail"]').first()[22m
[2m    - locator resolved to <div data-testid="concept-thumbnail" class="relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 border-primary/50 opacity-75 hover:opacity-100">…</div>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is not visible[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is not visible[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    58 × waiting for element to be visible, enabled and stable[22m
[2m       - element is not visible[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
 _(Journey 1: Visualizer)_

## Journey 1: Visualizer Lead (Margaret Wilson)

- **[FATAL]** Journey 1 failed: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: /submit request/i })[22m
 _(Journey 1: Visualizer)_

## Journey 1: Visualizer Lead (Margaret Wilson)

- **[ERROR]** Lead capture form did not show success state _(Journey 1: Visualizer)_

## Journey 2: Chat Lead (Derek Fournier)

- **[UI]** Skip photo interaction failed: locator.isVisible: Unexpected token "=" while parsing css selector "button:has-text("skip"), a:has-t _(Journey 2: Chat)_
- **[UI]** No lead capture form found — trying direct API _(Journey 2: Chat)_

## Journey 3: Contractor Lead (Steve & Karen Brodie)

- **[FATAL]** Journey 3 failed: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("New Lead"), button:has-text("Add Lead"), button:has-text("Lead Intake")').first()[22m
[2m    - locator resolved to <button data-size="sm" data-slot="button" data-variant="default" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-dest…>…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    57 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl">…</div> intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
 _(Journey 3: Contractor)_

## Journey 3: Contractor Lead (Steve & Karen Brodie)

- **[FATAL]** Journey 3 failed: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: /create lead/i })[22m
 _(Journey 3: Contractor)_

## Journey 3: Contractor Lead (Steve & Karen Brodie)

- **[FATAL]** Journey 3 failed: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button').filter({ hasText: 'Create Lead' }).first()[22m
 _(Journey 3: Contractor)_

## Journey 3: Contractor Lead (Steve & Karen Brodie)

- **[UI]** Lead not visible in table after creation — refreshing _(Journey 3: Contractor)_
- **[FATAL]** Journey 3 failed: page.evaluate: TypeError: leads.find is not a function
    at eval (eval at evaluate (:290:30), <anonymous>:5:26)
    at async <anonymous>:316:30 _(Journey 3: Contractor)_
