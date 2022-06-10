export default (emoji: string) => {
    // Return the emoji as a number. Like 0️⃣ = 0.
    const words = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
    
    return words.indexOf(emoji);
}