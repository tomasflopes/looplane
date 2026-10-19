# Finding a minimum

Keep track of the best (smallest) lap time seen so far. Start with the first value, then compare every remaining value to it.

```java
int fastest = laps[0];
for (int lap : laps) {
  if (lap < fastest) {
    fastest = lap;
  }
}
System.out.println(fastest);
```

The loop visits each lap once, so it takes **O(n)** time and uses **O(1)** extra space.
