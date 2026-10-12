exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  return {
    statusCode: 503,
    headers,
    body: JSON.stringify({ error: "WITHDRAWALS_DISABLED", message: "Retraits temporairement désactivés" }),
  };
};
