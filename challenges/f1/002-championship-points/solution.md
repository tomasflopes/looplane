# Adding values with an accumulator

An accumulator stores a running total. It begins at zero, and every value is added once.

```java
int total = 0;
for (int points : racePoints) {
  total += points;
}
System.out.println(total);
```

This is **O(n)** time and uses **O(1)** extra space.
