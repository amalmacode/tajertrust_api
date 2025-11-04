
      // Mobile menu toggle functionality
      document.addEventListener('DOMContentLoaded', function() {
          const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
          const navLinks = document.querySelector('.nav-links');
          
          mobileMenuToggle.addEventListener('click', function() {
              mobileMenuToggle.classList.toggle('active');
              navLinks.classList.toggle('active');
          });
          
          // Close menu when clicking on a link
          const navItems = document.querySelectorAll('.nav-links a');
          navItems.forEach(item => {
              item.addEventListener('click', function() {
                  mobileMenuToggle.classList.remove('active');
                  navLinks.classList.remove('active');
              });
          });
          
          // Close menu when clicking outside
          document.addEventListener('click', function(event) {
              if (!event.target.closest('.navbar')) {
                  mobileMenuToggle.classList.remove('active');
                  navLinks.classList.remove('active');
              }
          });
      });
  
