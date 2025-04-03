import { useState, useRef, useEffect, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faTimes, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { MarkerContext } from "./App"; // Import the context from MapComponent

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { text: "Hi! I'm Samantha, your virtual assistant for McDonald's Find McD. I can help you locate any store branch by name, location, or available facilities!", sender: "bot" },
    { text: "You may hover over the location on the map to inspect the McDelivery support area and see if it's available near you.", sender: "bot" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session_id, setSessionId] = useState("");
  const chatEndRef = useRef(null);
  const [showResetButton, setShowResetButton] = useState(false);
  
  // Get access to the marker highlighting function from context
  const { highlightOutletsByName, openOutletPopup } = useContext(MarkerContext);
  
  // Get formatted date like "1 Apr 2025 at 09:45"
  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', ' at');
  };

  // Loading Animation Component
  const LoadingIndicator = () => (
    <div style={styles.messageRow}>
      <div style={styles.logoCircleSmall}>
        <img src="/McDonalds-BotLogo.png" alt="McDonald's" style={styles.logoImage} />
      </div>
      <div style={styles.botMessage}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingDot} className="dot-1"></div>
          <div style={styles.loadingDot} className="dot-2"></div>
          <div style={styles.loadingDot} className="dot-3"></div>
        </div>
      </div>
    </div>
  );

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Store the user's message
    const userMessage = input.trim();
    
    // Add user message to chat
    setMessages(prev => [...prev, { text: userMessage, sender: "user" }]);
    
    // Clear input field immediately
    setInput("");
    
    // Show loading indicator
    setIsLoading(true);
    
    try {
      // Create FormData object
      const formData = new FormData();

      if (session_id == ''){
        formData.append('message', userMessage);
      } else {
        formData.append('message', userMessage);
        formData.append('session_id', session_id);
      }
      
      // Make API call
      const response = await fetch('https://findmcd-0-0-1.onrender.com/chatbot', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();

      setSessionId(result.session_id)
      
      let botResponse;

      // conditional responds
      if (result.outlet && Array.isArray(result.outlet) && result.outlet.length > 0) {
        // If outlets are found, highlight them on the map
        highlightOutletsByName(result.outlet);
        botResponse = { text: result.reply, sender: "bot", outlets: result.outlet };
      } else if (result.outlet && Array.isArray(result.outlet) && result.outlet.length === 0) {
        // Clear any highlighted outlets if none are found
        highlightOutletsByName([]);
        botResponse = { text: "Sorry, I couldn't find a matching branch. Can I help you find it using other details?", sender: "bot" };
      } else if (result.outlet == null) {
        botResponse = { text: result.reply, sender: "bot" };
      }
      
      setMessages(prev => [...prev, botResponse]);

    } catch (error) {
      console.error("Error calling chatbot API:", error);
      // Add error message
      setMessages(prev => [...prev, { 
        text: "Sorry, I'm having trouble connecting to the server. Please try again later.", 
        sender: "bot" 
      }]);
    } finally {
      // Hide loading indicator
      setIsLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Updated function to handle outlet button clicks
  const handleOutletClick = (outlet) => {
    openOutletPopup(outlet);
  };

  // Function to render outlet information as buttons
  const renderOutletButtons = (outlets) => {
    if (!outlets || !Array.isArray(outlets) || outlets.length === 0) return null;
    
    return (
      <div style={styles.outletContainer}>
        {outlets.map((outlet, index) => (
          <button 
            key={index} 
            style={styles.outletButton}
            onClick={() => handleOutletClick(outlet)}
          >
            <div style={styles.outletButtonContent}>
              <FontAwesomeIcon icon={faMapMarkerAlt} style={styles.locationIcon} />
              <div style={styles.outletInfo}>
                <div style={styles.outletName}>{outlet}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.chatbotContainer}>
      {/* Header */}
      <div style={styles.chatHeader}>
        <div style={styles.headerLeft}>
        <div style={styles.logoCircleSmall}>
          <img src="/McDonalds-BotLogo.png" alt="McDonald's" style={styles.logoImage} />
        </div>
          <span style={styles.headerTitle}>Samantha</span>
        </div>
      </div>
      
      {/* Chat body */}
      <div style={styles.chatBody}>
        {/* Profile section now inside chat body */}
        <div style={styles.profileSectionInChat}>
          <div style={styles.logoCircleLarge}>
            <img src="/McDonalds-BotLogo.png" alt="McDonald's" style={styles.logoImageLarge} />
          </div>
          <div style={styles.profileName}>Samantha</div>
          <div style={styles.profileDate}>{getCurrentDate()}</div>
        </div>

        {messages.map((msg, index) => (
          <div 
            key={index} 
            style={{
              ...styles.messageRow,
              justifyContent: msg.sender === "bot" ? "flex-start" : "flex-end"
            }}
          >
            {msg.sender === "bot" && (
              <div style={styles.logoCircleSmall}>
                <img src="/McDonalds-BotLogo.png" alt="McDonald's" style={styles.logoImage} />
              </div>
            )}
            <div 
              style={msg.sender === "bot" ? styles.botMessage : styles.userMessage}
            >
              <div style={msg.sender === "bot" ? styles.botText : styles.userText}>
                {msg.text}
                {msg.hasLink && (
                  <a href="#" style={styles.privacyLink}>Applicant Privacy Notice</a>
                )}
              </div>
              {msg.outlets && renderOutletButtons(msg.outlets)}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && <LoadingIndicator />}
        
        <div ref={chatEndRef} />
      </div>
      
      {/* Input area */}
      <div style={styles.chatFooter}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="I am looking for ..."
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.sendButton} disabled={isLoading}>
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      {/* Add animation keyframes using the style tag */}
      <style>{`
        @keyframes loadingBounce {
          0%, 80%, 100% { 
            transform: scale(0);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .dot-1, .dot-2, .dot-3 {
          animation: loadingBounce 1.4s infinite ease-in-out both;
        }
        
        .dot-1 {
          animation-delay: -0.32s;
        }
        
        .dot-2 {
          animation-delay: -0.16s;
        }
        
        .dot-3 {
          animation-delay: 0s;
        }
      `}</style>
    </div>
  );
}

// Styles remain unchanged
const styles = {
  chatbotContainer: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "320px",
    maxHeight: "90vh", // 90% of viewport height
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  chatHeader: {
    backgroundColor: "#ffffff",
    color: "#000000",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #eeeeee",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "500",
  },
  logoCircleSmall: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "8px",
    overflow: "hidden",
  },
  logoCircleLarge: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "8px",
    overflow: "hidden",
  },
  profileSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 0",
    borderBottom: "1px solid #eeeeee",
  },
  profileSectionInChat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 0",
    borderBottom: "1px solid #eeeeee",
    marginBottom: "16px",
  },
  profileName: {
    fontSize: "18px",
    fontWeight: "Bold",
    marginBottom: "4px",
  },
  profileDate: {
    fontSize: "14px",
    color: "#666666",
  },
  chatBody: {
    height: "calc(90vh - 200px)",
    maxHeight: "calc(90vh - 200px)",
    minHeight: "calc(90vh - 200px)",
    overflowY: "auto",
    padding: "16px",
    backgroundColor: "#f9f9f9",
    flex: 1,
    scrollbarWidth: "thin",
    scrollbarColor: "#cccccc transparent",
  },
  messageRow: {
    display: "flex",
    marginBottom: "16px",
    alignItems: "flex-start",
  },
  botMessage: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "12px",
    maxWidth: "75%",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    border: "1px solid #eeeeee",
  },
  userMessage: {
    backgroundColor: "#f0f0f0",
    borderRadius: "12px",
    padding: "12px",
    maxWidth: "75%",
  },
  botText: {
    color: "#333333",
    fontSize: "12px",
    lineHeight: "1.4",
    wordBreak: "break-word",
  },
  userText: {
    color: "#333333",
    fontSize: "12px",
    lineHeight: "1.4",
    wordBreak: "break-word",
  },
  privacyLink: {
    color: "#FFC72C",
    textDecoration: "none",
    fontWeight: "500",
    display: "block",
    marginTop: "4px",
  },
  chatFooter: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#ffffff",
    borderTop: "1px solid #eeeeee",
  },
  input: {
    flex: "1",
    padding: "10px 16px",
    border: "1px solid #eeeeee",
    outline: "none",
    borderRadius: "24px",
    backgroundColor: "#ffffff",
    fontSize: "12px",
  },
  sendButton: {
    marginLeft: "12px",
    width: "36px",
    height: "36px",
    backgroundColor: "#FFC72C",
    color: "#ffffff",
    borderRadius: "50%",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  logoImage: {
    width: "30px",
    height: "30px",
    objectFit: "contain",
  },
  logoImageLarge: {
    width: "80px",
    height: "80px",
    objectFit: "contain",
  },
  outletContainer: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  outletButton: {
    padding: "8px 12px",
    backgroundColor: "#ffffff",
    border: "1px solid #FFC72C",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left",
    display: "block",
    width: "100%",
    transition: "background-color 0.2s ease",
  },
  outletButtonContent: {
    display: "flex",
    alignItems: "flex-start",
  },
  locationIcon: {
    color: "#DB0007", // McDonald's red
    marginRight: "8px",
    marginTop: "2px",
  },
  outletInfo: {
    flex: 1,
  },
  outletName: {
    fontWeight: "bold",
    fontSize: "12px",
    marginBottom: "2px",
    color: "#DB0007", // McDonald's red
  },
  outletAddress: {
    fontSize: "11px",
    color: "#666666",
  },
  // Loading styles
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "6px",
    padding: "6px 0",
  },
  loadingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#FFC72C", // McDonald's yellow
    display: "inline-block",
  },
}