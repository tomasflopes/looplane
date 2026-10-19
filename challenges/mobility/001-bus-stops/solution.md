# One total, one loop

Use a variable called `total` and add every passenger count to it.

```java
int total = 0;
for (int passengers : stops) {
  total += passengers;
}
System.out.println(total);
```

Every stop is processed once: **O(n)** time, **O(1)** extra space.
