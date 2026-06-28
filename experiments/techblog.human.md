# Understanding Database Indexing

An index is a lookup table for your rows. Without one, the database reads every row to answer a query. With one, it jumps straight to the matches.

That speed isn't free. Every index you add is another structure the database updates on each write, and it eats disk. So the rule of thumb is simple: index the columns you filter and join on, nothing else.

The rest of this guide walks through how a B-tree index actually works, when it helps, and the three cases where it quietly makes things slower.
