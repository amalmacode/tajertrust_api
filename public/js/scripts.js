document.addEventListener('DOMContentLoaded', () => {
      console.log("✅ scripts.js loaded");

      // 🔍 Search Filter of my blacklist 
      const searchInput = document.getElementById('searchInput');
      const container = document.getElementById('blacklistContainer');
      if (searchInput) {
        if (container) {
        const entries = container.children;
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.toLowerCase();
          for (let item of entries) {
            const phoneText = item.innerText.toLowerCase();
            item.style.display = phoneText.includes(query) ? '' : 'none';
          }
        });
      }
    }
  
      // ✏️ Edit Modal
      window.openEditModal = function(id, phone, reason) {
        document.getElementById('editId').value = id;
        document.getElementById('editPhone').value = phone;
        document.getElementById('editReason').value = reason;
        document.getElementById('editModal').classList.remove('hidden');
        document.getElementById('editModal').classList.add('flex');
      };
  
      window.closeEditModal = function() {
        document.getElementById('editModal').classList.add('hidden');
        document.getElementById('editModal').classList.remove('flex');
      };
  
    

    // search bar in pending sellers
const searchInputPending = document.getElementById('searchPending');
if (searchInputPending) {
  searchInputPending.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    const rows = document.querySelectorAll('#pendingTable tr');
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

  // search bar in validated sellers
 const searchInputValidated = document.getElementById('searchValidated');
  if (searchInputValidated) {
    searchInputValidated.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const rows = document.querySelectorAll('#validatedTable tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  // openDevalidateModal 
  window.openDevalidateModal = function(sellerId, businessName) {
  document.getElementById('devalidateSellerId').value = sellerId;
  document.getElementById('devalidateBusinessName').innerText = businessName;
  // document.getElementById('devalidateCurrentPage').value = currentPage; // set current page
  document.getElementById('devalidateModal').classList.remove('hidden');
  document.getElementById('devalidateModal').classList.add('flex');
};

// CloseDevalidateModal
window.closeDevalidateModal = function() {
  document.getElementById('devalidateModal').classList.add('hidden');
  document.getElementById('devalidateModal').classList.remove('flex');
};

  // 🗑️ Delete Modal
  // 🗑️ Delete Modal
window.openDeleteModal = function(sellerId, businessName) {
  const modal = document.getElementById('deleteModal');
  const sellerIdInput = document.getElementById('deleteSellerId');
  const businessNameText = document.getElementById('deleteBusinessName');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  sellerIdInput.value = sellerId;
  businessNameText.innerText = `Voulez-vous vraiment supprimer le vendeur "${businessName}" ?`;
};

window.closeDeleteModal = function() {
  const modal = document.getElementById('deleteModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('deleteForm').reset();
};


   // Function to open the delete phone modal and display the number
   window.openDeletePhoneModal = function(id, phone) {
    const deleteModal = document.getElementById('deleteModal');
    const deletePhone = document.getElementById('deletePhone');
    const deleteForm = document.getElementById('deleteForm');

    if (deleteModal && deletePhone && deleteForm) {
      deletePhone.textContent = phone;
      deleteForm.action = `/blacklist/delete/${id}`;
      deleteModal.classList.remove('hidden');
      deleteModal.classList.add('flex');
    }
  };

  // Function to close the delete phone modal
  window.closeDeletePhoneModal = function() {
    const deleteModal = document.getElementById('deleteModal');
    const deleteForm = document.getElementById('deleteForm');
    const deletePhone = document.getElementById('deletePhone');

    if (deleteModal && deleteForm && deletePhone) {
      deleteModal.classList.add('hidden');
      deleteModal.classList.remove('flex');
      deletePhone.textContent = '';
      deleteForm.action = '';
    }
  };
    

// 🔍 Search in deleted sellers
const searchInputDeleted = document.getElementById('searchDeleted');
    const table = document.getElementById('deletedTable');
    const rows = table?.querySelectorAll('tbody tr');

    if (searchInputDeleted && table && rows) {
      searchInputDeleted.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();

        rows.forEach(row => {
          let rowMatches = false;

          row.querySelectorAll('td').forEach(cell => {
            // Remove existing highlights first
            const originalText = cell.textContent;
            cell.innerHTML = originalText;

            if (query && originalText.toLowerCase().includes(query)) {
              rowMatches = true;

              // Highlight matches
              const regex = new RegExp(`(${query})`, 'gi');
              const highlighted = originalText.replace(regex, `<span class="highlight">$1</span>`);
              cell.innerHTML = highlighted;
            }
          });

          row.style.display = rowMatches || query === '' ? '' : 'none';
        });
      });
    }

// open deleteReason Moal 
window.openDeleteReasonModal = function(reasonId, reasonText) {
  document.getElementById('deleteReasonText').innerText = reasonText;
  document.getElementById('deleteReasonForm').action = `/admin/blacklist_reasons/delete/${reasonId}`;
  document.getElementById('deleteReasonModal').classList.remove('hidden');
};
// Close  deleteReason Moal 
window.closeDeleteReasonModal = function() {
  document.getElementById('deleteReasonModal').classList.add('hidden');
};

// mobile MENU
const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = document.getElementById('closeMenu');

    if (burger && mobileMenu && closeMenu) {
      burger.addEventListener('click', () => {
        mobileMenu.classList.remove('translate-x-full');
      });

      closeMenu.addEventListener('click', () => {
        mobileMenu.classList.add('translate-x-full');
      });
    } else {
      console.warn('Some mobile menu elements not found.');
    }

 // gestion message mot de passe : u delà de 8 caracteres / correspondance
 const form = document.querySelector('form');
  const passwordInput = form.querySelector('input[name="password"]');
  const confirmPasswordInput = form.querySelector('input[name="confirmPassword"]');

  // Créer les éléments d'erreur
  const passwordError = document.createElement('p');
  passwordError.className = 'text-red-500 text-sm mt-1';
  passwordInput.parentNode.appendChild(passwordError);

  const confirmPasswordError = document.createElement('p');
  confirmPasswordError.className = 'text-red-500 text-sm mt-1';
  confirmPasswordInput.parentNode.appendChild(confirmPasswordError);

  function resetField(input, errorElement) {
    input.classList.remove('border-red-500');
    errorElement.textContent = '';
  }

  function showError(input, errorElement, message) {
    input.classList.add('border-red-500');
    errorElement.textContent = message;
  }

  form.addEventListener('submit', function (e) {
    let hasError = false;

    // Réinitialiser tous les messages d'erreur
    resetField(passwordInput, passwordError);
    resetField(confirmPasswordInput, confirmPasswordError);

    // Vérification longueur mot de passe
    if (passwordInput.value.length < 8) {
      e.preventDefault();
      showError(passwordInput, passwordError, 'Le mot de passe doit contenir au moins 8 caractères.');
      hasError = true;
    }

    // Vérification correspondance mots de passe
    if (passwordInput.value !== confirmPasswordInput.value) {
      e.preventDefault();
      showError(confirmPasswordInput, confirmPasswordError, 'Les mots de passe ne correspondent pas.');
      hasError = true;
    }

    if (hasError) {
      return;
    }
  });

  // Nettoyage dynamique : dès que l'utilisateur tape, on enlève l'erreur
  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length >= 8) {
      resetField(passwordInput, passwordError);
    }
  });

  confirmPasswordInput.addEventListener('input', () => {
    if (passwordInput.value === confirmPasswordInput.value) {
      resetField(confirmPasswordInput, confirmPasswordError);
    }
  });

  }); // fin de test DOMContentLoaded

  // // Integrer les accordians : dans la page FAQ
  // N'est pas à linterieur de test sur DOMContentLoaded, car en fait , le script 
  // est au dessous de tag </body> et donc tout le dom est prelabalement chargé!
const faqList = document.getElementById('faq-list');
  
  if (faqList) {
    const toggles = faqList.querySelectorAll('.faq-toggle');

    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const answer = toggle.nextElementSibling;
        const icon = toggle.querySelector('.faq-icon');

        if (!answer || !icon) return; // 🔥 sécurisation anti-erreur

        if (answer.classList.contains('hidden')) {
          answer.classList.remove('hidden');
          icon.textContent = '-';
        } else {
          answer.classList.add('hidden');
          icon.textContent = '+';
        }
      });
    });
  }

// UPLOAD FILE CSV/EXCEL MODALS 
  const openUploadModal = () => document.getElementById('uploadModal').classList.remove('hidden');
  const closeUploadModal = () => document.getElementById('uploadModal').classList.add('hidden');
  const closeErrorModal = () => document.getElementById('errorModal').classList.add('hidden');
  const closeSuccessModal = () => document.getElementById('successModal').classList.add('hidden');

  document.getElementById('openUploadModal').addEventListener('click', openUploadModal);
  document.getElementById('uploadBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) return alert("Veuillez sélectionner un fichier.");
    // Check file extension
// const allowedExtensions = ['csv', 'xls', 'xlsx'];
// const extension = file.name.split('.').pop().toLowerCase();
// if (!allowedExtensions.includes(extension)) {
//   return alert("Format de fichier invalide. Veuillez sélectionner un fichier CSV ou Excel.");
// }
const allowedTypes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
if (!allowedTypes.includes(file.type)) {
  document.getElementById('fileFormatModal').classList.remove('hidden');
  return;
}

    const formData = new FormData();
    formData.append('blacklist_csv', file);

    // Show progress
    document.getElementById('progressBar').classList.remove('hidden');

    fetch('/upload-blacklist', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
.then(data => {
  const { success, errors, moreErrors } = data;

  if (errors && errors.length > 0) {
  document.getElementById('errorMessage').innerHTML = `
    <strong>Certains numéros n'ont pas été importés :</strong>
    <ul class="mt-2 list-disc pl-6 text-left">
      ${errors.slice(0, 5).map(e => `<li>${e.phone}: ${e.reason}</li>`).join('')}
    </ul>
    ${errors.length > 5 ? '<div class="mt-2">...et plus.</div>' : ''}
  `;
  document.getElementById('errorModal').classList.remove('hidden');
}
 else if (success) {
    document.getElementById('successMessage').innerHTML = success;
    document.getElementById('successModal').classList.remove('hidden');
  }

  closeUploadModal();
})

    .catch(() => {
      document.getElementById('errorMessage').innerHTML =
        "Une erreur technique est survenue. Veuillez réessayer.";
      document.getElementById('errorModal').classList.remove('hidden');
      closeUploadModal();
    });
  });

  // close FileFormatModal
  const closeFileFormatModal = () => {
  document.getElementById('fileFormatModal').classList.add('hidden');
};
  