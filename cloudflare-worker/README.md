# Day of Week API - Cloudflare Worker

A serverless REST API that calculates the day of the week for any date using the Doomsday algorithm.

## API Endpoints

The API supports three different endpoint formats:

### 1. Path Parameter (Recommended)
```
GET /api/dayofweek/YYYY-MM-DD
```
Example: `https://www.psiegel.org/api/dayofweek/2025-01-15`

### 2. Date Query Parameter
```
GET /api/dayofweek?date=YYYY-MM-DD
```
Example: `https://www.psiegel.org/api/dayofweek?date=2025-01-15`

### 3. Individual Query Parameters
```
GET /api/dayofweek?year=YYYY&month=MM&day=DD
```
Example: `https://www.psiegel.org/api/dayofweek?year=2025&month=1&day=15`

## Response Format

### Success Response
```json
{
  "dayOfWeek": "Wednesday",
  "date": "2025-01-15",
  "year": 2025,
  "month": 1,
  "day": 15,
  "monthName": "January",
  "calculation": {
    "centuryCode": 2,
    "xxYearQuotient": 2,
    "xxYearRemainder": 1,
    "xxYearRemDiv4Quotient": 0,
    "monthDoomsday": 3,
    "userDoomsday": 12,
    "totalResult": 17,
    "weekDateValue": 3
  }
}
```

### Error Response
```json
{
  "error": "Year must be between 1 and 4199",
  "input": {
    "year": 5000,
    "month": 1,
    "day": 15
  }
}
```

## Features

- **Multiple date input formats** - Path parameter, single date query, or separate year/month/day
- **CORS enabled** - Can be called from any website
- **Detailed calculation breakdown** - Returns all intermediate values from the Doomsday algorithm
- **Input validation** - Validates year range (1-4199), month, day, and leap years
- **API documentation** - Visit the root endpoint for interactive documentation
- **Fast and serverless** - Deployed on Cloudflare's edge network

## Deployment Instructions

### Prerequisites
1. A Cloudflare account (free tier works)
2. Node.js installed on your computer
3. The Wrangler CLI tool

### Step 1: Install Wrangler
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```
This will open a browser window to authenticate with your Cloudflare account.

### Step 3: Deploy the Worker
From the `cloudflare-worker` directory, run:
```bash
wrangler deploy
```

### Step 4: Configure Custom Domain (Optional)

#### Option A: Using Cloudflare Dashboard
1. Go to your Cloudflare Dashboard
2. Select your domain (psiegel.org)
3. Go to **Workers & Pages**
4. Click on your deployed worker (`dayofweek-api`)
5. Go to **Settings** → **Triggers** → **Routes**
6. Click **Add Route**
7. Enter route: `www.psiegel.org/api/dayofweek/*`
8. Select your zone: `psiegel.org`
9. Click **Save**

#### Option B: Using wrangler.toml
Uncomment and configure the routes in `wrangler.toml`:
```toml
routes = [
  { pattern = "www.psiegel.org/api/dayofweek/*", zone_name = "psiegel.org" }
]
```
Then deploy again:
```bash
wrangler deploy
```

### Step 5: Test Your API
Once deployed, test it with curl or in your browser:

```bash
# Test with curl
curl https://www.psiegel.org/api/dayofweek/2025-01-15

# Or visit in browser
https://www.psiegel.org/api/dayofweek/2025-01-15
```

## Testing Before Deployment

You can test the worker locally:

```bash
wrangler dev
```

This starts a local server at `http://localhost:8787` where you can test the API before deploying.

## Example Usage

### JavaScript/Fetch
```javascript
fetch('https://www.psiegel.org/api/dayofweek/2025-01-15')
  .then(response => response.json())
  .then(data => {
    console.log(`The date falls on a ${data.dayOfWeek}`);
  });
```

### cURL
```bash
curl https://www.psiegel.org/api/dayofweek/2025-01-15
```

### Python
```python
import requests

response = requests.get('https://www.psiegel.org/api/dayofweek/2025-01-15')
data = response.json()
print(f"The date falls on a {data['dayOfWeek']}")
```

## Supported Date Range

- **Years**: 1 to 4199
- **Months**: 1 to 12 (or January to December)
- **Days**: 1 to 31 (validated based on month and leap year)

## Algorithm

This API uses the **Doomsday algorithm**, an efficient method for calculating the day of the week for any date. The algorithm was developed by John Conway and is the same one used in the Birthday Calculator on www.psiegel.org.

## Cost

Cloudflare Workers free tier includes:
- 100,000 requests per day
- 10ms CPU time per request

For most personal projects, this is completely free!

## Updating the Worker

To update the worker after making changes:

```bash
wrangler deploy
```

## Monitoring

View your worker's analytics in the Cloudflare Dashboard under **Workers & Pages** → **Your Worker** → **Metrics**.

## Troubleshooting

### Worker not responding at custom domain
- Check that the route is configured correctly in Cloudflare Dashboard
- Ensure your domain's DNS is proxied through Cloudflare (orange cloud)
- Wait a few minutes for DNS propagation

### Error: "Not authenticated"
Run `wrangler login` again to re-authenticate.

### Testing locally returns errors
Make sure you're running `wrangler dev` from the `cloudflare-worker` directory.

## Support

For issues or questions, contact Preston or check the Cloudflare Workers documentation at https://developers.cloudflare.com/workers/
