import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import "../styles/UserDetail.css";
// Added to allow redirect after deleting the user
import { useNavigate } from "react-router-dom"; 

export default function User() {
  const params = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Added to programmatically navigate after deleting the user
  const navigate = useNavigate();


  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:3000/users/${params._id}`
        );
        setUserData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch user details");
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    if (params._id) {
      fetchUser();
    }
  }, [params._id]);

  if (loading) {
    return (
      <Container className="pt-5 pb-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="pt-5 pb-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  if (!userData) {
    return (
      <Container className="pt-5 pb-5">
        <Alert variant="info">No user found.</Alert>
      </Container>
    );
  }

  const user = userData.user;
  const bestRatedEvents = userData.bestRatedEvents || [];

  const getGenderColor = (gender) => {
    return gender === "M" ? "primary" : "danger";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deleteUser = async () => {
  // Confirmation popup before deleting
  if (!window.confirm("Are you sure you want to delete this user?")) return;

  try {
    // Sends DELETE request to backend with the user id
    await axios.delete(`http://localhost:3000/users/${params._id}`);
    alert("User deleted successfully!");
    navigate("/users");
  } catch (error) {
    alert("Failed to delete user: " + (error.message || "Unknown error"));
  }
};

  return (
    <Container className="pt-5 pb-5">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-0">{user.name}</h1>
          <button
            className="btn btn-danger mt-3"
            // Added to trigger user deletion
            onClick={deleteUser}
          >
            Delete User
         </button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={6}>
          <Card className="user-detail-card shadow-sm">
            <Card.Body>
              <h5 className="card-title mb-4">Personal Information</h5>
              <div className="user-info-item mb-3">
                <span className="info-label">Name:</span>
                <span className="info-value">{user.name}</span>
              </div>
              <div className="user-info-item mb-3">
                <span className="info-label">Gender:</span>
                <Badge bg={getGenderColor(user.gender)} className="ms-2">
                  {user.gender === "M" ? "Male" : "Female"}
                </Badge>
              </div>
              <div className="user-info-item mb-3">
                <span className="info-label">Age:</span>
                <span className="info-value">{user.age} years</span>
              </div>
              <div className="user-info-item">
                <span className="info-label">Occupation:</span>
                <span className="info-value">{user.occupation}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="user-stats-card shadow-sm">
            <Card.Body>
              <h5 className="card-title mb-4">Statistics</h5>
              <div className="stats-item">
                <div className="stat-number">{user.events?.length || 0}</div>
                <div className="stat-label">Total Events</div>
              </div>
              <div className="stats-item-divider"></div>
              <div className="stats-item">
                <div className="stat-number">{bestRatedEvents.length}</div>
                <div className="stat-label">Top Rated Events</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {bestRatedEvents.length > 0 && (
        <Row>
          <Col>
            <Card className="best-events-card shadow-sm">
              <Card.Body>
                <h5 className="card-title mb-4">
                  Top 3 Best Rated Events
                </h5>
                <div className="best-events-list">
                  {bestRatedEvents.map((event, index) => (
                    <div key={index} className="best-event-item">
                      <div className="event-rank">#{index + 1}</div>
                      <div className="event-info">
                        <div className="event-name">{event.establishmentName}</div>
                        <div className="event-address">{event.address}</div>
                        <div className="event-meta">
                          <Badge bg="secondary" className="me-2">
                            {event.county}
                          </Badge>
                          <span className="event-date">
                            {event.date ? formatDate(event.date) : "No date"}
                          </span>
                        </div>
                      </div>
                      <div className="event-rating-badge">
                        <Badge bg="warning" text="dark">
                          ⭐ {event.rating}/5
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {user.events && user.events.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card className="all-events-card shadow-sm">
              <Card.Body>
                <h5 className="card-title mb-4">
                  All Events ({user.events.length})
                </h5>
                <div className="all-events-list">
                  {user.events.map((event, index) => (
                    <div key={index} className="all-event-item">
                      <div className="event-event-id">Event #{event.eventId}</div>
                      <div className="event-event-rating">
                        <Badge bg="info">
                          ⭐ {event.rating}/5
                        </Badge>
                      </div>
                      <div className="event-event-date">
                        {new Date(event.datetime).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
