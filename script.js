const poolData = {
    UserPoolId: 'eu-north-1_o4xSSQGiK',
    ClientId: '35cbbhp6mv494umuihlq2d1u1b'
};

const API_URL = 'https://s83rvjyf5h.execute-api.eu-north-1.amazonaws.com/prod/get-game';
const PLATFORM_LABELS = {
    mac: 'Mac',
    windows: 'Windows'
};

var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
var tempUsername;

window.onload = function() {
    var currentUser = userPool.getCurrentUser();
    if (currentUser) {
        currentUser.getSession((err, session) => {
            if (!err && session.isValid()) {
                localStorage.setItem('idToken', session.getIdToken().getJwtToken());
                showDownloadSection(currentUser.getUsername());
            }
        });
    }
};

function register() {
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const msg = document.getElementById("reg-error-msg");

    if (!username || !email || !password) {
        msg.innerText = "Rellena todos los campos.";
        return;
    }

    // LISTA DE ATRIBUTOS (Incluyendo el obligatorio preferred_username)
    var attributeList = [];
    
    // Atributo Email
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({
        Name: 'email',
        Value: email
    }));

    // Atributo Preferred Username (Cumpliendo con tu esquema obligatorio)
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({
        Name: 'preferred_username',
        Value: username
    }));

    userPool.signUp(username, password, attributeList, null, (err, result) => {
        if (err) {
            msg.innerText = err.message || JSON.stringify(err);
            return;
        }
        tempUsername = result.user.getUsername();
        showSection('confirm-section');
    });
}

function confirmRegistration() {
    const code = document.getElementById("confirm-code").value;
    const userData = { Username: tempUsername, Pool: userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            document.getElementById("confirm-error-msg").innerText = err.message;
            return;
        }
        alert("Cuenta activada.");
        showSection('login-section');
    });
}

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const authenticationData = { Username: username, Password: password };
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    const userData = { Username: username, Pool: userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            localStorage.setItem('idToken', result.getIdToken().getJwtToken());
            showDownloadSection(username);
        },
        onFailure: (err) => {
            document.getElementById("error-msg").innerText = err.message;
        }
    });
}

function getDownloadLink(platform) {
    const btn = document.getElementById(`btn-download-${platform}`);
    const idToken = localStorage.getItem('idToken');
    const statusMsg = document.getElementById("status-msg");
    const platformLabel = PLATFORM_LABELS[platform] || platform;

    if (!btn) return;

    if (!idToken) {
        statusMsg.innerText = "Tu sesión ha caducado. Vuelve a iniciar sesión.";
        showSection('login-section');
        return;
    }

    setDownloadButtonsDisabled(true);
    statusMsg.innerText = "";
    btn.innerText = `Generando enlace para ${platformLabel}...`;

    fetch(`${API_URL}?platform=${encodeURIComponent(platform)}`, {
        method: 'GET',
        headers: { 'Authorization': idToken }
    })
    .then(res => res.json())
    .then(data => {
        if (data.downloadUrl) {
            window.location.href = data.downloadUrl;
            btn.innerText = `Descarga de ${platformLabel} iniciada`;
        } else {
            throw new Error(data.error || "Error de servidor");
        }
    })
    .catch(err => {
        statusMsg.innerText = err.message;
        btn.innerText = `Reintentar ${platformLabel}`;
    })
    .finally(() => {
        setDownloadButtonsDisabled(false);
    });
}

function setDownloadButtonsDisabled(disabled) {
    document.querySelectorAll('[data-download-btn]').forEach(button => {
        button.disabled = disabled;
    });
}

function showSection(id) {
    ['login-section', 'register-section', 'confirm-section', 'download-section'].forEach(s => {
        document.getElementById(s).classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
}

function showDownloadSection(username) {
    showSection('download-section');
    document.getElementById("user-display").innerText = username;
}

function logout() {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) currentUser.signOut();
    localStorage.removeItem('idToken');
    location.reload();
}
