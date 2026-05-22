import React, { useState } from "react";

const BusSeatLayout = () => {
  const [selectedSeats, setSelectedSeats] = useState([]);

  const seats = [
    ["1", "2", null, "3", "4"],
    ["5", "6", null, "7", "8"],
    ["9", "10", null, "11", "12"],
    ["13", "14", null, "15", "16"],
    ["17", "18", null, "19", "20"],
    ["21", "22", null, "23", "24"],
  ];

  const bookedSeats = ["3", "10", "18"];

  const toggleSeat = (seat) => {
    if (bookedSeats.includes(seat)) return;

    setSelectedSeats((prev) =>
      prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : [...prev, seat]
    );
  };

  return (
    <div
      style={{
        background: "#f4f7fb",
        minHeight: "100vh",
        padding: 30,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 25,
          borderRadius: 20,
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* Driver */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 25,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              background: "#2d3436",
              borderRadius: "12px 12px 4px 4px",
              color: "#fff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: "bold",
            }}
          >
            Driver
          </div>
        </div>

        {/* Seats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {seats.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
              }}
            >
              {row.map((seat, index) =>
                seat === null ? (
                  <div key={index} style={{ width: 40 }} />
                ) : (
                  <div
                    key={seat}
                    onClick={() => toggleSeat(seat)}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      cursor: bookedSeats.includes(seat)
                        ? "not-allowed"
                        : "pointer",
                      background: bookedSeats.includes(seat)
                        ? "#b2bec3"
                        : selectedSeats.includes(seat)
                        ? "#00b894"
                        : "#dfe6e9",
                      color: bookedSeats.includes(seat)
                        ? "#636e72"
                        : "#2d3436",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontWeight: "bold",
                      transition: "0.2s",
                      border: selectedSeats.includes(seat)
                        ? "2px solid #019875"
                        : "2px solid transparent",
                    }}
                  >
                    {seat}
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: 25,
            display: "flex",
            gap: 20,
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          <Legend color="#dfe6e9" label="Available" />
          <Legend color="#00b894" label="Selected" />
          <Legend color="#b2bec3" label="Booked" />
        </div>
      </div>
    </div>
  );
};

const Legend = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div
      style={{
        width: 18,
        height: 18,
        background: color,
        borderRadius: 4,
      }}
    />
    <span>{label}</span>
  </div>
);

export default BusSeatLayout; 