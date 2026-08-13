const css = `
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 10px; }
    .container { max-width: 900px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h2 { text-align: center; color: #e11e22; }
    
    .search-box { display: flex; gap: 10px; margin-bottom: 20px; }
    .search-box input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }

    #table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; min-width: 600px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #e11e22; color: white; }
    
    input[type="number"] { width: 60px; padding: 5px; border-radius: 4px; border: 1px solid #ccc; }
    
    .status-icon { font-size: 1.2rem; text-align: center; }
    .btn-pdf { width: 100%; padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
    .btn-pdf:hover { background: #218838; }

    /* Responsive untuk HP */
    @media screen and (max-width: 600px) {
        .search-box { flex-direction: column; }
        th, td { padding: 8px; font-size: 14px; }
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = css;
document.head.appendChild(styleSheet);
