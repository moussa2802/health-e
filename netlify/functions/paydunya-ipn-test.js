exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: "PayDunya IPN endpoint is working",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    }),
  };
};
