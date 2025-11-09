# ADADProject API Documentation

REST API for ADADProject (events and users)

---

## API Info
- **Title:** ADADProject API
- **Version:** 1.0.0
- **Base URL:** `http://localhost:3000`

---

## Endpoints

### Events

#### `GET /events`
- **Description:** List events (paginated)
- **Query Parameters:**
	- `page` (integer, default: 1): Page number
	- `limit` (integer, default: 20, max: 100): Items per page
- **Response:** Paginated list of events

#### `POST /events`
- **Description:** Create an event
- **Request Body:**
	- See [EventCreate](#eventcreate)
- **Response:** Event created

#### `GET /events/top/{limit}`
- **Description:** Top events by average score
- **Path Parameter:**
	- `limit` (integer, default: 10): Number of events
- **Response:** Array of [EventWithStats](#eventwithstats)

#### `GET /events/ratings/{order}`
- **Description:** Events ordered by number of reviews
- **Path Parameter:**
	- `order` (string, `asc` or `desc`): Sort order
- **Response:** Array of [EventWithReviewCount](#eventwithreviewcount)

#### `GET /events/star`
- **Description:** Events with most 5-star reviews
- **Response:** Array of [EventWithFiveStars](#eventwithfivestars)

#### `GET /events/trending`
- **Description:** Trending events (recent 30 days)
- **Response:** Array of [EventWithReviewCount](#eventwithreviewcount)

#### `GET /events/county/{county}`
- **Description:** Events in a county with stats
- **Path Parameter:**
	- `county` (string): County name
- **Response:**
	- `county` (string)
	- `totalEvents` (integer)
	- `countyAverage` (number, nullable)
	- `events`: Array of [EventWithStats](#eventwithstats)

#### `GET /events/{idOrYear}`
- **Description:** Get event by id or list events reviewed in a year
- **Path Parameter:**
	- `idOrYear` (string): ObjectId or 4-digit year
- **Response:**
	- If ObjectId: [EventWithStats](#eventwithstats)
	- If year: [EventsByYear](#eventsbyyear)
- **Errors:**
	- `400`: Bad Request
	- `404`: Not Found

#### `PUT /events/{id}`
- **Description:** Update an event
- **Path Parameter:**
	- `id` (string): Event ID
- **Request Body:**
	- See [EventUpdate](#eventupdate)
- **Response:** [Event](#event)
- **Errors:**
	- `404`: Not Found

#### `DELETE /events/{id}`
- **Description:** Delete an event
- **Path Parameter:**
	- `id` (string): Event ID
- **Response:**
	- `deleted` (boolean)
- **Errors:**
	- `404`: Not Found

---

### Users

#### `GET /users`
- **Description:** List users (paginated)
- **Query Parameters:**
	- `page` (integer, default: 1)
	- `limit` (integer, default: 20, max: 100)
- **Response:** Paginated list of users

#### `POST /users`
- **Description:** Create one or multiple users
- **Request Body:**
	- Single [UserCreate](#usercreate) or array of [UserCreate](#usercreate)
- **Response:** Insert result

#### `GET /users/{id}`
- **Description:** Get user by id (includes user's top 3 events)
- **Path Parameter:**
	- `id` (integer): User ID
- **Response:** [UserWithTop3](#userwithtop3)
- **Errors:**
	- `404`: Not Found

#### `PUT /users/{id}`
- **Description:** Update user
- **Path Parameter:**
	- `id` (integer): User ID
- **Request Body:**
	- See [UserUpdate](#userupdate)
- **Response:** [User](#user)
- **Errors:**
	- `404`: Not Found

#### `DELETE /users/{id}`
- **Description:** Delete user
- **Path Parameter:**
	- `id` (integer): User ID
- **Response:**
	- `deleted` (boolean)
- **Errors:**
	- `404`: Not Found

#### `POST /users/{id}/review/{event_id}`
- **Description:** Add or update an event rating by a user
- **Path Parameters:**
	- `id` (integer): User ID
	- `event_id` (string): Event ID (ObjectId)
- **Request Body:**
	- `rating` (integer, 0-5, required)
	- `ratedAt` (string, date-time, optional)
- **Response:**
	- `201`: Review added
	- `200`: Review updated

#### `GET /users/top`
- **Description:** Top active users (top 5 by number of reviews)
- **Response:**
	- `message` (string)
	- `totalUsers` (integer)
	- `topUsers`: Array of [User](#user)

#### `GET /users/active/{year}`
- **Description:** Active users in a year
- **Path Parameter:**
	- `year` (integer)
- **Response:**
	- `year` (integer)
	- `activeUserCount` (integer)
	- `activeUsers`: Array of [User](#user)

---

## Schemas

### Event
```json
{
	"_id": "string",
	"changeDate": "string (date-time)",
	"establishmentID": "string",
	"establishmentName": "string",
	"address": "string",
	"zipCode": "string",
	"county": "string"
}
```

### EventCreate
Required fields: changeDate, establishmentID, establishmentName, address, zipCode, county

### EventUpdate
Any subset of Event fields

### EventRating
```json
{
	"eventId": "string",
	"rating": 0-5,
	"timestamp": "integer (ms)",
	"date": "string (date-time)"
}
```

### EventWithStats
Event +
- `averageScore` (number, nullable)
- `reviewsCount` (integer)

### EventWithReviewCount
Event +
- `reviewsCount` (integer)

### EventWithFiveStars
Event +
- `fiveStarsCount` (integer)

### EventsByYear
```json
{
	"year": "integer",
	"events": [Event]
}
```

### User
```json
{
	"_id": "integer",
	"name": "string",
	"gender": "M|F",
	"age": "integer",
	"occupation": "string",
	"events": [EventRating]
}
```

### UserCreate
Required fields: name, gender, age, occupation

### UserUpdate
Any subset of User fields

### UserWithTop3
```json
{
	"user": User,
	"bestRatedEvents": [Event + rating, timestamp, date]
}
```

### PaginatedEvents
```json
{
	"page": "integer",
	"limit": "integer",
	"total": "integer",
	"items": [Event]
}
```

### PaginatedUsers
```json
{
	"page": "integer",
	"limit": "integer",
	"total": "integer",
	"items": [User]
}
```

### Error
```json
{
	"error": "string"
}
```

---

## Error Responses
- **400 Bad Request:** Invalid request
- **404 Not Found:** Resource not found
