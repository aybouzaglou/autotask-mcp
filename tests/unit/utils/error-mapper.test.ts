import { ErrorMapper } from "../../../src/utils/error-mapper";

describe("ErrorMapper", () => {
  describe("mapAutotaskError", () => {
    describe("400 Bad Request Errors", () => {
      it("should map inactive resource error", () => {
        const error = {
          response: {
            status: 400,
            data: {
              message: "Cannot assign inactive resource",
              code: "INACTIVE_RESOURCE",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error, "ticket_update");

        expect(result.code).toBe("INACTIVE_RESOURCE");
        expect(result.message).toContain("inactive resource");
        expect(result.guidance).toContain("active in Autotask");
        expect(result.correlationId).toMatch(/^ERR-\d+-\d+$/);
      });

      it("should map invalid status error", () => {
        const error = {
          response: {
            status: 400,
            data: {
              message: "Invalid status transition",
              code: "INVALID_STATUS",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("INVALID_STATUS");
        expect(result.message).toContain("Invalid ticket status");
        expect(result.guidance).toContain("status transitions");
      });

      it("should map invalid priority error", () => {
        const error = {
          response: {
            status: 400,
            data: {
              message: "Invalid priority value",
              code: "INVALID_PRIORITY",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("INVALID_PRIORITY");
        expect(result.message).toContain("Invalid ticket priority");
        expect(result.guidance).toContain("priority values");
      });

      it("should map missing required field error", () => {
        const error = {
          response: {
            status: 400,
            data: {
              message: "Required field ticketID is missing",
              code: "MISSING_FIELD",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("MISSING_REQUIRED_FIELD");
        expect(result.message).toContain("Required field missing");
        expect(result.guidance).toContain("ticketID");
      });

      it("should map generic validation error", () => {
        const error = {
          response: {
            status: 400,
            data: {
              message: "Validation failed for unknown reason",
              code: "VALIDATION_ERROR",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.message).toContain("Validation failed");
        expect(result.guidance).toContain("required fields");
      });
    });

    describe("401/403 Authorization Errors", () => {
      it("should map 401 authentication error", () => {
        const error = {
          response: {
            status: 401,
            data: {
              message: "Invalid credentials",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("AUTHENTICATION_FAILED");
        expect(result.message).toContain("Authentication failed");
        expect(result.guidance).toContain("credentials");
      });

      it("should map 403 permission denied error", () => {
        const error = {
          response: {
            status: 403,
            data: {
              message: "Insufficient permissions",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error, "update_ticket");

        expect(result.code).toBe("PERMISSION_DENIED");
        expect(result.message).toContain("Permission denied");
        expect(result.guidance).toContain("permission");
        expect(result.guidance).toContain("update_ticket");
      });
    });

    describe("404 Not Found Errors", () => {
      it("should map resource not found error", () => {
        const error = {
          response: {
            status: 404,
            data: {
              message: "Ticket 12345 not found",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error, "get_ticket");

        expect(result.code).toBe("RESOURCE_NOT_FOUND");
        expect(result.message).toContain("not found");
        expect(result.message).toContain("Ticket 12345");
        expect(result.guidance).toContain("get_ticket");
      });
    });

    describe("405 Method Not Allowed Errors", () => {
      it("should map method not allowed error", () => {
        const error = {
          response: {
            status: 405,
            data: {
              message: "Method not allowed",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("METHOD_NOT_ALLOWED");
        expect(result.message).toContain("HTTP method not allowed");
        expect(result.guidance).toContain("not supported");
      });
    });

    describe("409 Conflict Errors", () => {
      it("should map data conflict error", () => {
        const error = {
          response: {
            status: 409,
            data: {
              message: "Data has been modified",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("CONFLICT");
        expect(result.message).toContain("conflict");
        expect(result.guidance).toContain("modified by another user");
        expect(result.guidance).toContain("Refresh");
      });
    });

    describe("5xx Server Errors", () => {
      it("should map 500 internal server error", () => {
        const error = {
          response: {
            status: 500,
            data: {
              message: "Internal server error",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("AUTOTASK_SERVER_ERROR");
        expect(result.message).toContain("server error");
        expect(result.message).toContain("500");
        expect(result.guidance).toContain("retry");
      });

      it("should map 503 service unavailable error", () => {
        const error = {
          response: {
            status: 503,
            data: {
              message: "Service temporarily unavailable",
            },
          },
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("AUTOTASK_SERVER_ERROR");
        expect(result.message).toContain("503");
        expect(result.guidance).toContain("experiencing issues");
      });
    });

    describe("Unknown/Generic Errors", () => {
      it("should map unknown error with default guidance", () => {
        const error = {
          message: "Something went wrong",
          code: "UNKNOWN",
        };

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("AUTOTASK_ERROR");
        expect(result.message).toContain("Something went wrong");
        expect(result.guidance).toContain("try again");
        expect(result.correlationId).toBeDefined();
      });

      it("should handle error without response object", () => {
        const error = new Error("Network timeout");

        const result = ErrorMapper.mapAutotaskError(error);

        expect(result.code).toBe("AUTOTASK_ERROR");
        expect(result.message).toContain("Network timeout");
        expect(result.correlationId).toBeDefined();
      });
    });
  });

  describe("mapValidationErrors", () => {
    it("should map single validation error", () => {
      const errors = ["Ticket ID is required"];

      const result = ErrorMapper.mapValidationErrors(errors);

      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Request validation failed");
      expect(result.guidance).toBe("Ticket ID is required");
      expect(result.correlationId).toMatch(/^ERR-\d+-\d+$/);
    });

    it("should map multiple validation errors with pipe separator", () => {
      const errors = [
        "Ticket ID is required",
        "Invalid publish level: must be 1 or 3",
        "Description exceeds maximum length",
      ];

      const result = ErrorMapper.mapValidationErrors(errors);

      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("Request validation failed");
      expect(result.guidance).toContain("Ticket ID is required");
      expect(result.guidance).toContain("Invalid publish level");
      expect(result.guidance).toContain("Description exceeds");
      expect(result.guidance).toMatch(/\|/); // Contains pipe separator
    });

    it("should handle empty errors array", () => {
      const errors: string[] = [];

      const result = ErrorMapper.mapValidationErrors(errors);

      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.guidance).toBe("");
    });
  });

  describe("mapGenericError", () => {
    it("should create generic error with default code", () => {
      const result = ErrorMapper.mapGenericError(
        "Something unexpected happened",
      );

      expect(result.code).toBe("ERROR");
      expect(result.message).toBe("Something unexpected happened");
      expect(result.guidance).toContain("unexpected error");
      expect(result.correlationId).toMatch(/^ERR-\d+-\d+$/);
    });

    it("should create generic error with custom code", () => {
      const result = ErrorMapper.mapGenericError(
        "Custom error message",
        "CUSTOM_CODE",
      );

      expect(result.code).toBe("CUSTOM_CODE");
      expect(result.message).toBe("Custom error message");
      expect(result.correlationId).toBeDefined();
    });
  });

  describe("generateCorrelationId", () => {
    it("should generate unique correlation IDs", () => {
      const id1 = ErrorMapper.generateCorrelationId();
      const id2 = ErrorMapper.generateCorrelationId();
      const id3 = ErrorMapper.generateCorrelationId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);

      // All should match the format ERR-<timestamp>-<counter>
      expect(id1).toMatch(/^ERR-\d+-\d+$/);
      expect(id2).toMatch(/^ERR-\d+-\d+$/);
      expect(id3).toMatch(/^ERR-\d+-\d+$/);
    });

    it("should increment counter in correlation ID", () => {
      const id1 = ErrorMapper.generateCorrelationId();
      const id2 = ErrorMapper.generateCorrelationId();

      // Extract counter values
      const counter1 = parseInt(id1.split("-")[2]);
      const counter2 = parseInt(id2.split("-")[2]);

      expect(counter2).toBeGreaterThan(counter1);
    });
  });

  describe("Context-aware error mapping", () => {
    it("should include context in error guidance when provided", () => {
      const error = {
        response: {
          status: 403,
          data: { message: "Forbidden" },
        },
      };

      const result = ErrorMapper.mapAutotaskError(error, "create_ticket_note");

      expect(result.guidance).toContain("create_ticket_note");
    });

    it("should work without context", () => {
      const error = {
        response: {
          status: 404,
          data: { message: "Not found" },
        },
      };

      const result = ErrorMapper.mapAutotaskError(error);

      expect(result.code).toBe("RESOURCE_NOT_FOUND");
      expect(result.guidance).toBeDefined();
    });
  });
});
