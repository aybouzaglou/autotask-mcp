// Unit tests for search_companies with exact-match-first strategy
// Tests targeted search, exact match prioritization, and performance safeguards

import { AutotaskToolHandler } from "../../../src/handlers/tool.handler";
import type { AutotaskService } from "../../../src/services/autotask.service";
import type { Logger } from "../../../src/utils/logger";

// Mock companies for testing
const MOCK_COMPANIES = [
  { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
  { id: 2, companyName: "Mandev Solutions", isActive: 1 },
  { id: 3, companyName: "ManDevCo LLC", isActive: 1 },
  { id: 4, companyName: "ABC Corporation", isActive: 1 },
  { id: 5, companyName: "XYZ Industries", isActive: 1 },
];

// Create 100+ mock companies for large result set tests
const LARGE_COMPANY_SET = [
  ...MOCK_COMPANIES,
  ...Array.from({ length: 100 }, (_, i) => ({
    id: i + 10,
    companyName: `Test Company ${i + 1}`,
    isActive: 1,
  })),
];

const createHandler = (
  mockSearchResults: any[] = MOCK_COMPANIES,
  overrides: Partial<AutotaskService> = {}
) => {
  const mockService = {
    searchCompanies: jest.fn().mockResolvedValue(mockSearchResults),
    getMetadataCache: jest.fn(),
    ...overrides,
  } as unknown as AutotaskService;

  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  } as unknown as Logger;

  return {
    handler: new AutotaskToolHandler(mockService, mockLogger),
    mockService,
    mockLogger,
  };
};

describe("AutotaskToolHandler.search_companies - Smart Search", () => {
  describe("Tool Definition", () => {
    test("includes searchTerm and isActive parameters", async () => {
      const { handler } = createHandler();
      const tools = await handler.listTools();
      const searchTool = tools.find((t) => t.name === "search_companies");

      expect(searchTool).toBeDefined();
      expect(searchTool?.inputSchema.properties).toHaveProperty("searchTerm");
      expect(searchTool?.inputSchema.properties).toHaveProperty("isActive");
      expect(searchTool?.inputSchema.properties).toHaveProperty("pageSize");
    });

    test("encourages using searchTerm in description", async () => {
      const { handler } = createHandler();
      const tools = await handler.listTools();
      const searchTool = tools.find((t) => t.name === "search_companies");

      expect(searchTool?.description).toContain("searchTerm");
      expect(searchTool?.description).toContain("BEST PRACTICE");
      expect(searchTool?.description).toContain("targeted lookups");
    });
  });

  describe("Default Behavior", () => {
    test("defaults to pageSize 50 when not specified", async () => {
      const { handler, mockService } = createHandler();

      await handler.callTool("search_companies", {
        searchTerm: "test",
      });

      expect(mockService.searchCompanies).toHaveBeenCalledWith({
        searchTerm: "test",
        pageSize: 50,
      });
    });

    test("respects explicitly provided pageSize", async () => {
      const { handler, mockService } = createHandler();

      await handler.callTool("search_companies", {
        searchTerm: "test",
        pageSize: 100,
      });

      expect(mockService.searchCompanies).toHaveBeenCalledWith({
        searchTerm: "test",
        pageSize: 100,
      });
    });

    test("allows pageSize -1 for unlimited results", async () => {
      const { handler, mockService } = createHandler();

      await handler.callTool("search_companies", {
        searchTerm: "test",
        pageSize: -1,
      });

      expect(mockService.searchCompanies).toHaveBeenCalledWith({
        searchTerm: "test",
        pageSize: -1,
      });
    });
  });

  describe("Exact Match Prioritization", () => {
    test("prioritizes single exact match when multiple results exist", async () => {
      const { handler } = createHandler([
        { id: 2, companyName: "Mandev Solutions", isActive: 1 },
        { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
        { id: 3, companyName: "ManDevCo LLC", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "mandevco llc", // Exact match for ManDevCo LLC (case-insensitive)
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      // First result should be the exact match
      expect(result.data[0].companyName).toBe("ManDevCo LLC");
      expect(result.message).toContain("exact match");
      expect(result.message).toContain("ManDevCo LLC");
      expect(result.data.length).toBe(3); // All results still returned, but reordered
    });

    test("handles case-insensitive exact matching", async () => {
      const { handler } = createHandler([
        { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
        { id: 2, companyName: "Mandev Solutions", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "MANDEVCO PROPERTIES INC.",
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      expect(result.data[0].companyName).toBe("Mandevco Properties Inc.");
      expect(result.message).toContain("exact match");
    });

    test("trims whitespace when matching", async () => {
      const { handler } = createHandler([
        { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
        { id: 2, companyName: "Mandev Solutions", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "  mandevco properties inc.  ",
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      expect(result.data[0].companyName).toBe("Mandevco Properties Inc.");
      expect(result.message).toContain("exact match");
    });

    test("handles multiple exact matches", async () => {
      // Rare case: multiple companies with same name
      const { handler } = createHandler([
        { id: 1, companyName: "Acme Corp", isActive: 1 },
        { id: 2, companyName: "Acme Corp", isActive: 1 },
        { id: 3, companyName: "Acme Corporation", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "acme corp",
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      // First two results should be exact matches
      expect(result.data[0].companyName).toBe("Acme Corp");
      expect(result.data[1].companyName).toBe("Acme Corp");
      expect(result.data[2].companyName).toBe("Acme Corporation");
      expect(result.message).toContain("2 exact matches");
    });

    test("does not prioritize when only one result", async () => {
      const { handler } = createHandler([
        { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "mandevco",
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      // Should just return the single result without "exact match" messaging
      expect(result.data[0].companyName).toBe("Mandevco Properties Inc.");
      expect(result.message).toBe("Found 1 companies");
    });

    test("skips exact match logic when no searchTerm provided", async () => {
      const { handler } = createHandler(MOCK_COMPANIES);

      const response = await handler.callTool("search_companies", {
        isActive: true,
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      // Results should be in original order
      expect(result.data.length).toBe(5);
      expect(result.message).not.toContain("exact match");
    });
  });

  describe("No Exact Match Scenarios", () => {
    test("returns all partial matches when no exact match exists", async () => {
      const { handler } = createHandler([
        { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
        { id: 2, companyName: "Mandev Solutions", isActive: 1 },
        { id: 3, companyName: "ManDevCo LLC", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "mandev", // Partial match only
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      expect(result.data.length).toBe(3);
      expect(result.message).toBe("Found 3 companies");
    });
  });

  describe("Performance Safeguards", () => {
    test("logs warning for result sets > 100", async () => {
      const { handler, mockLogger } = createHandler(LARGE_COMPANY_SET);

      await handler.callTool("search_companies", {
        pageSize: 200,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Large result set returned: 105 companies")
      );
    });

    test("does not log warning for result sets <= 100", async () => {
      const { handler, mockLogger } = createHandler(
        MOCK_COMPANIES.slice(0, 50)
      );

      await handler.callTool("search_companies", {
        pageSize: 50,
      });

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining("Large result set")
      );
    });

    test("logs query parameters for observability", async () => {
      const { handler, mockLogger } = createHandler();

      await handler.callTool("search_companies", {
        searchTerm: "mandevco",
        isActive: true,
        pageSize: 50,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "search_companies query",
        expect.objectContaining({
          searchTerm: "mandevco",
          isActive: true,
          requestedPageSize: 50,
          hasFilters: true,
        })
      );
    });

    test("logs result metrics including query time", async () => {
      const { handler, mockLogger } = createHandler();

      await handler.callTool("search_companies", {
        searchTerm: "test",
        pageSize: 50,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "search_companies results",
        expect.objectContaining({
          resultCount: expect.any(Number),
          queryTimeMs: expect.any(Number),
          wasTruncated: expect.any(Boolean),
        })
      );
    });
  });

  describe("Messaging and User Guidance", () => {
    test("suggests filters when no results and no searchTerm", async () => {
      const { handler } = createHandler([]);

      const response = await handler.callTool("search_companies", {
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      expect(result.message).toContain("Try adding searchTerm parameter");
      expect(result.message).toContain("pageSize: -1");
    });

    test("shows truncation message when results equal pageSize", async () => {
      const { handler } = createHandler(
        Array.from({ length: 50 }, (_, i) => ({
          id: i,
          companyName: `Company ${i}`,
          isActive: 1,
        }))
      );

      const response = await handler.callTool("search_companies", {
        searchTerm: "Company",
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      expect(result.message).toContain("results may be truncated");
      expect(result.message).toContain("pageSize: -1");
    });

    test("simple message when results < pageSize", async () => {
      const { handler } = createHandler(MOCK_COMPANIES);

      const response = await handler.callTool("search_companies", {
        searchTerm: "test",
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      expect(result.message).toBe("Found 5 companies");
    });
  });

  describe("Real-World Incident Scenario", () => {
    test("incident fix: 'mandevco' search should return targeted results", async () => {
      // Simulate the 315-company scenario from the incident
      const all315Companies = [
        { id: 1, companyName: "Mandevco Properties Inc.", isActive: 1 },
        { id: 2, companyName: "ManDevCo LLC", isActive: 1 },
        ...Array.from({ length: 313 }, (_, i) => ({
          id: i + 3,
          companyName: `Other Company ${i + 1}`,
          isActive: 1,
        })),
      ];

      // Mock service returns only 50 results with default pageSize
      const { handler, mockService } = createHandler(
        all315Companies.slice(0, 50)
      );

      const response = await handler.callTool("search_companies", {
        searchTerm: "mandevco", // User's original query
        // pageSize not specified - should default to 50
      });

      // Verify pageSize defaulted correctly
      expect(mockService.searchCompanies).toHaveBeenCalledWith({
        searchTerm: "mandevco",
        pageSize: 50, // Not -1!
      });

      // Verify results
      const result = JSON.parse(response.content[0].text);
      expect(result.data.length).toBeLessThanOrEqual(50);
      
      // Should have returned much less than 315
      expect(result.data.length).toBeLessThan(315);
    });

    test("incident scenario: exact match found quickly without bulk pull", async () => {
      const { handler } = createHandler([
        { id: 100, companyName: "Mandev Solutions", isActive: 1 },
        { id: 200, companyName: "Mandevco Properties Inc.", isActive: 1 },
        { id: 300, companyName: "ManDevCo LLC", isActive: 1 },
      ]);

      const response = await handler.callTool("search_companies", {
        searchTerm: "mandevco properties inc.",
        isActive: true,
        pageSize: 50,
      });

      const result = JSON.parse(response.content[0].text);
      
      // Exact match should be first
      expect(result.data[0].companyName).toBe("Mandevco Properties Inc.");
      expect(result.message).toContain("exact match");
      
      // Only 3 results, not 315
      expect(result.data.length).toBe(3);
    });
  });
});
