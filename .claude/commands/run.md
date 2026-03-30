Build images and start the GymFlow stack using docker-compose.review.yml.

## Step 1 — Free ports 8080 and 3000

```bash
# Stop any containers already occupying ports 8080 or 3000
for port in 8080 3000; do
  cid=$(docker ps --filter "publish=$port" -q)
  [ -n "$cid" ] && docker stop $cid
done
```

## Step 2 — Build images

```bash
docker-compose -f docker-compose.review.yml build
```

If the build fails with a compilation or TypeScript error: report it and stop.

## Step 3 — Start the stack

```bash
docker-compose -f docker-compose.review.yml down --remove-orphans
docker-compose -f docker-compose.review.yml up -d
```

## Step 4 — Wait for health (60 s max)

```bash
for i in $(seq 1 12); do curl -sf http://localhost:8080/api/v1/health && echo " OK" && break || (echo " not ready..."; sleep 5); done
```

If healthy: "Stack is running. Open http://localhost:3000."

If not healthy after 60 s, show logs:
```bash
docker-compose -f docker-compose.review.yml logs --tail=40 backend
docker-compose -f docker-compose.review.yml logs --tail=40 frontend
```
Report the error and stop. Do not attempt to fix infrastructure issues.