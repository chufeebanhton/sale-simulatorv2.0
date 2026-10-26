# Sale Simulator API

This server exposes product, image, and health-check endpoints. By default, the
three HTTP servers listen on:

| Service | Base URL |
| --- | --- |
| Products | `http://localhost:3000` |
| Images | `http://localhost:4000` |
| Health check | `http://localhost:1200` |

## Start the server

From the `server` directory:

```sh
npm install
npm run build
npm start
```

For development, run `npm run dev`.

## Response format

Successful JSON endpoints return an envelope with a status, message, data, and
timestamp:

```json
{
  "status": "success",
  "message": "Products retrieved successfully",
  "data": [],
  "meta": {
    "timestamp": "2026-10-26T00:00:00.000Z"
  }
}
```

Errors return an envelope with a machine-readable code:

```json
{
  "status": "error",
  "message": "page must be a positive integer",
  "error": {
    "code": "VALIDATION_FAILED"
  },
  "meta": {
    "timestamp": "2026-10-26T00:00:00.000Z"
  }
}
```

## Products

All product routes are under `/api/v2.0.0/products`.

### List products

```http
GET /api/v2.0.0/products?page=1&limit=9
```

`page` is 1-based and `limit` is the number of products per page. Both must be
positive integers; they default to `1` and `9`.

```sh
curl 'http://localhost:3000/api/v2.0.0/products?page=1&limit=9'
```

### Create a product

Send `multipart/form-data` to `POST /api/v2.0.0/products`. All fields below are
required:

| Field | Value |
| --- | --- |
| `name` | Non-empty product name |
| `sku` | Non-empty SKU |
| `description` | Non-empty description |
| `brand` | Non-empty brand |
| `categoriesId` | JSON array of non-empty strings, e.g. `["cat-1"]` |
| `price` | Number greater than zero |
| `compareAtPrice` | Non-negative number; current validation requires `price >= compareAtPrice` |
| `stockQuantity` | Non-negative integer |
| `image` | Image file (JPEG, PNG, or WebP; max 5 MiB) |

Images are resized/cropped to 800 × 800 WebP and saved by the server. A product
is marked `active` when stock is above zero, otherwise `inactive`.

```sh
curl -X POST 'http://localhost:3000/api/v2.0.0/products' \
  -F 'name=Desk lamp' \
  -F 'sku=LAMP-001' \
  -F 'description=Adjustable desk lamp' \
  -F 'brand=Example' \
  -F 'categoriesId=["lighting"]' \
  -F 'price=45' \
  -F 'compareAtPrice=40' \
  -F 'stockQuantity=12' \
  -F 'image=@./lamp.png'
```

The success response's `data` is the created product's `_id`.

### Update a product

```http
PATCH /api/v2.0.0/products/{product_id}
```

Send `multipart/form-data` with one or more fields to update: `name`, `sku`,
`description`, `brand`, `categoriesId`, `price`, `compareAtPrice`, or
`stockQuantity`. `categoriesId` must be a JSON array. Numeric fields must be
non-negative; `price` must be greater than zero, and the final price must not
be lower than `compareAtPrice`. Updating `stockQuantity` also updates the
product status.

An image can be replaced by sending both `image` (the new file) and `imageUrl`
(the current image filename). The image filename must match the product's
current image.

```sh
curl -X PATCH 'http://localhost:3000/api/v2.0.0/products/PRODUCT_ID' \
  -F 'name=Updated lamp' \
  -F 'stockQuantity=8'
```

### Delete a product

```http
DELETE /api/v2.0.0/products/{product_id}
```

```sh
curl -X DELETE 'http://localhost:3000/api/v2.0.0/products/PRODUCT_ID'
```

The endpoint removes the product from the upstream API, the in-memory cache,
and its locally stored image.

## Product images

Product image URLs use the image service on port `4000`:

```http
GET /images/{uuid}.webp
```

For example:

```sh
curl -o product.webp \
  'http://localhost:4000/images/12345678-1234-4234-8234-123456789abc.webp'
```

Only UUID-formatted `.webp` filenames are accepted. An invalid path returns a
client error, and an image that does not exist returns `IMAGE_NOT_FOUND`.

## Health check

```http
GET /health-check
```

```sh
curl 'http://localhost:1200/health-check'
```

## Error handling

Common error codes include:

| Code | Meaning |
| --- | --- |
| `VALIDATION_FAILED` | Invalid pagination or product field |
| `MISSING_FIELD` | Required product field is missing |
| `INVALID_BODY` | Request body is not valid multipart form data |
| `INVALID_IMAGE` | Image is missing, invalid, or unsupported |
| `IMAGE_TOO_LARGE` | Image or request body exceeds the size limit |
| `IMAGE_NOT_FOUND` | Requested local image does not exist |
| `INVALID_IMAGE_PATH` | Image path or filename is invalid |
| `NOT_FOUND` | Product does not exist |
| `ROUTE_NOT_FOUND` | No matching API route |
| `UPSTREAM_ERROR` | The upstream product API request failed |
| `QUEUE_FULL` | Scheduler request queue is full |

## Run tests

From the `server` directory:

```sh
npm test
npm run typecheck
```

The tests use a mocked upstream API and temporary image directories; they do not
require a live upstream account.
