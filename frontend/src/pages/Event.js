import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, ListGroup } from "react-bootstrap";
import axios from "axios";
import "../styles/UserDetail.css";

export default function Event() {
  const params = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:3000/events/${params._id}`);
        setEventData(res.data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch event");
        setEventData(null);
      } finally {
        setLoading(false);
      }
    };

    if (params._id) fetchEvent();
  }, [params._id]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatScore = (score) => {
    if (score === null || score === undefined || score === '') return "-";
    const n = Number(score);
    if (Number.isNaN(n)) return "-";
    return n.toFixed(2);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await axios.delete(`http://localhost:3000/events/${params._id}`);
      alert("Event deleted");
      navigate("/events");
    } catch (err) {
      alert("Failed to delete event: " + (err.message || "Unknown"));
    }
  };

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

  if (!eventData) {
    return (
      <Container className="pt-5 pb-5">
        <Alert variant="info">Event not found.</Alert>
      </Container>
    );
  }

  // eventData may be full event object or wrapped (e.g. { event: ... }) depending on API
  const ev = eventData.event || eventData;

  const reviews = ev.reviews || ev.events || []; // try common shapes

  return (
    <Container className="pt-5 pb-5">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-0">{ev.establishmentName}</h1>
          <div className="text-muted">{ev.address}</div>
        </Col>
        <Col className="text-end">
          <Button variant="danger" onClick={handleDelete} className="mt-1">
            Delete Event
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={6}>
          <Card className="user-detail-card shadow-sm">
            <Card.Body>
              <h5 className="card-title mb-4">Event Information</h5>
              <div className="user-info-item mb-3">
                <span className="info-label">Establishment ID:</span>
                <span className="info-value">{ev.establishmentID}</span>
              </div>
              <div className="user-info-item mb-3">
                <span className="info-label">County:</span>
                <Badge bg="secondary" className="ms-2">
                  {ev.county}
                </Badge>
              </div>
              <div className="user-info-item mb-3">
                <span className="info-label">Zip Code:</span>
                <span className="info-value">{ev.zipCode}</span>
              </div>
              <div className="user-info-item">
                <span className="info-label">Last Change:</span>
                <span className="info-value">{formatDate(ev.changeDate)}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="user-stats-card shadow-sm">
            <Card.Body>
              <h5 className="card-title mb-4">Statistics</h5>
              <div className="stats-item">
                <div className="stat-number">{formatScore(ev.averageScore)}</div>
                <div className="stat-label">Average Score</div>
              </div>
              <div className="stats-item-divider"></div>
              <div className="stats-item">
                <div className="stat-number">{ev.reviewsCount ?? (reviews.length || 0)}</div>
                <div className="stat-label">Reviews</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}