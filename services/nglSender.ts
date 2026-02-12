
/**
 * NGL.link submission endpoint: POST https://ngl.link/api/submit
 * Payload: { username: string, question: string, deviceId: string }
 */

export const sendToNGL = async (username: string, question: string): Promise<{ success: boolean; error?: string }> => {
  const deviceId = crypto.randomUUID();
  
  try {
    // Using 'no-cors' allows the request to be sent to the server without a CORS preflight 
    // for simple requests (like form-urlencoded). 
    // Note: 'no-cors' results in an "opaque" response, meaning we can't see if it 
    // actually succeeded on the server side, but the browser will at least dispatch it.
    await fetch(`https://ngl.link/api/submit`, {
      method: 'POST',
      mode: 'no-cors', // Critical for cross-origin POST without preflight
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        username: username,
        question: question,
        deviceId: deviceId,
      }),
    });

    // In no-cors mode, we can't read the response. 
    // If the fetch didn't throw, the request was at least sent.
    return { success: true };
  } catch (error) {
    console.error("NGL Submission Error:", error);
    let errorMessage = "Network Error";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('Failed to fetch')) {
        errorMessage = "CORS / Security Blocked";
      }
    }
    return { success: false, error: errorMessage };
  }
};
