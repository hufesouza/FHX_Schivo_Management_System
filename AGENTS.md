# Assembly Explorer
- Store make/buy classification and sourcing on the part, not the BOM relationship, so repeated occurrences share one source of truth.
- Keep sourcing unknown until explicitly entered; a drawing reference alone does not establish manufacture or purchase.
- Normalize sourcing through the shared assembly type helpers so the editor and flowchart use consistent manufacturing-location and supplier rules.
- Resolve finished-assembly selection through the shared side-aware helper, preferring the same drawing family, so side filters cannot leave an opposite-side root selected.