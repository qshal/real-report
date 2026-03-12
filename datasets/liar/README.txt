
LIAR Dataset Download Instructions:
====================================

1. Visit: https://www.cs.ucsb.edu/~william/data/liar_dataset.zip
2. Download and extract the ZIP file
3. Place the following files in datasets/liar/:
   - train.tsv
   - test.tsv
   - valid.tsv

Dataset Structure (TSV format):
- Column 1: ID
- Column 2: Label (true, mostly-true, half-true, barely-true, false, pants-fire)
- Column 3: Statement
- Column 4: Subject(s)
- Column 5: Speaker
- Column 6: Speaker's job
- Column 7: State
- Column 8: Party
- Columns 9-13: Counts for each label in speaker's history
- Column 14: Context

Citation:
Wang, W. Y. (2017). "Liar, Liar Pants on Fire": A New Benchmark Dataset for Fake News Detection.
ACL 2017.
