//save this in /theme/js/booking-form.js
(function($) {
    'use strict';
    
    // Initialize form when document is ready
    $(document).ready(function() {
        // Hide all steps except the first one on page load
        $('.form-step').not('.step-1-content').removeClass('active');
        $('.step-1-content').addClass('active');
        
        // Set initial step in hidden input
        $('input[name="current_step"]').val(1);
        
        // Make sure progress bar shows first step as active
        $('.booking-progress-steps .step').removeClass('active');
        $('.booking-progress-steps .step-1').addClass('active');
        
        $('.booking-progress-bar .progress-section').removeClass('active');
        $('.booking-progress-bar .section-1').addClass('active');
        
        // Initialize date picker
        if ($.fn.datepicker) {
            $('.datepicker').datepicker({
                dateFormat: 'MM d, yy',
                minDate: 0,
                onSelect: function(date) {
                    $(this).data('selected-date', date);
                    $('input[name="available_date"]').val(date);
                }
            });
        }
        
        // Handle next button clicks
        $('.next-btn').on('click', function(e) {
            
            const $form = $(this).closest('form');
            const $formContainer = $(this).closest('.booking-form-container');
            const currentStepNum = parseInt($form.find('input[name="current_step"]').val());
            const nextStepNum = currentStepNum + 1;
            

            
            // Basic validation
            if (currentStepNum === 2) {
                if ($('.time-slot.selected').length === 0) {
                    alert('Please select a time slot');
                    return;
                }
            } else if (currentStepNum === 3) {
                if (!$('input[name="customer_name"]').val() || 
                    !$('input[name="customer_email"]').val() || 
                    !$('input[name="customer_phone"]').val()) {
                    alert('Please fill in all required fields');
                    return;
                }
            }
            
            // Save form data
            saveFormData($form);
            
            // Hide current step
            $('.form-step').removeClass('active');
            
            // Show next step
            $('.step-' + nextStepNum + '-content').addClass('active');
            
            // Update progress bar
            updateProgress(nextStepNum, $formContainer);
            
            // Update hidden input
            $form.find('input[name="current_step"]').val(nextStepNum);
            
            // Special actions for certain steps
            if (currentStepNum === 1) {
                fetchTimeSlots($form);
            }
            if (currentStepNum === 3) {
                if (typeof Stripe !== 'undefined') {
                    initStripeElements();
                }
            }
            
            // Scroll to top of form
            $('html, body').animate({
                scrollTop: $form.offset().top - 50
            }, 500);
        });
        
        // Handle back button clicks
        $('.back-btn').on('click', function(e) {
 // Debug log
            e.preventDefault(); // Prevent default form submission
            
            const $form = $(this).closest('form');
            const $formContainer = $(this).closest('.booking-form-container');
            const currentStepNum = parseInt($form.find('input[name="current_step"]').val());
            const prevStepNum = currentStepNum - 1;
            
 // Debug log
            
            // Prevent going back from first step
            if (currentStepNum <= 1) {
                return;
            }
            
            // Hide current step
            $('.form-step').removeClass('active');
            
            // Show previous step
            $('.step-' + prevStepNum + '-content').addClass('active');
            
            // Update progress bar
            updateProgress(prevStepNum, $formContainer);
            
            // Update hidden input
            $form.find('input[name="current_step"]').val(prevStepNum);
            
            // Scroll to top of form
            $('html, body').animate({
                scrollTop: $form.offset().top - 50
            }, 500);
        });
        
        
        // Handle time slot selection
        $(document).on('click', '.time-slot', function() {
            $('.time-slot').removeClass('selected');
            $(this).addClass('selected');
            
            // Store selected time and date
            const time = $(this).data('time');
            const date = $(this).data('date');
            $('input[name="booking_time"]').val(time);
            $('input[name="booking_date"]').val(date);
            
            // Enable next button
            $('.time-next-btn').prop('disabled', false);
        });
        
        // Handle form submission
        $('form.booking-form').on('submit', function(e) {
            e.preventDefault();
            const $form = $(this);
            const $formContainer = $form.closest('.booking-form-container');
            
            // Go to confirmation step
            $('.form-step').removeClass('active');
            $('.step-5-content').addClass('active');
            updateProgress(5, $formContainer);
            $form.find('input[name="current_step"]').val(5);
            
            // Generate reference number
            const reference = 'BK' + Math.floor(10000 + Math.random() * 90000);
            $('.confirm-reference').text(reference);
        });
        
        // Handle "Book Another" button
        $('.book-another-btn').on('click', function() {
            const $form = $(this).closest('form');
            const $formContainer = $form.closest('.booking-form-container');
            
            // Reset form
            $form[0].reset();
            
            // Go back to first step
            $('.form-step').removeClass('active');
            $('.step-1-content').addClass('active');
            updateProgress(1, $formContainer);
            $form.find('input[name="current_step"]').val(1);
            
            // Scroll to top of form
            $('html, body').animate({
                scrollTop: $form.offset().top - 50
            }, 500);
        });
    });
    
    /**
     * Update progress indicators
     */
    function updateProgress(stepNum, $formContainer) {
        // Update progress steps
        $formContainer.find('.booking-progress-steps .step').removeClass('active');
        $formContainer.find('.booking-progress-steps .step-' + stepNum).addClass('active');
        
        // Update progress bar sections
        $formContainer.find('.booking-progress-bar .progress-section').removeClass('active');
        for (let i = 1; i <= stepNum; i++) {
            $formContainer.find('.booking-progress-bar .section-' + i).addClass('active');
        }
    }
    
    /**
     * Save form data
     */
    function saveFormData($form) {
        // Update booking summary with current form values
        const serviceName = $form.find('select[name="service_option_1"]').val();
        const staffOption = $form.find('select[name="employee"] option:selected');
        const staffName = staffOption.length ? staffOption.text().split('(')[0].trim() : '';
        const staffPrice = staffOption.length ? parseFloat(staffOption.text().match(/\$([0-9.]+)/)?.[1] || 0) : 0;
        const bookingTime = $form.find('input[name="booking_time"]').val() || '';
        const bookingDate = $form.find('input[name="booking_date"]').val() || '';
        
        // Update in step 3
        $('.booking-summary .service-name').text(serviceName);
        $('.booking-summary .staff-name').text(staffName);
        $('.booking-summary .booking-time').text(bookingTime);
        $('.booking-summary .booking-date').text(bookingDate);
        $('.booking-summary .booking-price').text('$' + staffPrice.toFixed(2));
        
        // Update in step 4
        $('.payment-summary .final-price').text(staffPrice.toFixed(2));
        
        // Update in step 5
        $('.confirmation-message .confirm-service-name').text(serviceName);
        $('.confirmation-message .confirm-datetime').text(bookingDate + ' at ' + bookingTime);
        $('.confirmation-message .confirm-staff-name').text(staffName);
    }
    
    /**
     * Fetch time slots
     */
    function fetchTimeSlots($form) {
        const serviceOption = $form.find('select[name="service_option_1"]').val();
        const staffName = $form.find('select[name="employee"] option:selected').text().split('(')[0].trim();
        
        // Update service and staff name in heading
        $('.service-name').text(serviceOption);
        $('.staff-name').text(staffName);
        
        // Show loading indicator
        $('.time-slots-container').html('<div class="loading-spinner">Loading available time slots...</div>');
        
        // For demo, generate mock time slots
        setTimeout(function() {
            const mockSlots = {
                'Monday': {
                    date: 'March 24, 2025',
                    times: ['9:00 AM', '10:30 AM', '1:00 PM', '3:30 PM']
                },
                'Tuesday': {
                    date: 'March 25, 2025',
                    times: ['9:30 AM', '11:00 AM', '2:00 PM', '4:30 PM']
                },
                'Wednesday': {
                    date: 'March 26, 2025',
                    times: ['10:00 AM', '12:30 PM', '3:00 PM', '5:00 PM']
                }
            };
            
            renderTimeSlots(mockSlots);
        }, 1000);
    }
    
    /**
     * Render time slots
     */
    function renderTimeSlots(slotData) {
        const $container = $('.time-slots-container');
        $container.empty();
        
        // Create tabs for each day
        const $tabContainer = $('<div class="time-slots-tabs"></div>');
        const $contentContainer = $('<div class="time-slots-content"></div>');
        
        let isFirstTab = true;
        
        // Create a tab and content panel for each day
        $.each(slotData, function(day, dayData) {
            // Create tab
            const $tab = $('<div class="time-tab" data-day="' + day + '">' + day + ' ' + dayData.date + '</div>');
            if (isFirstTab) {
                $tab.addClass('active');
            }
            $tabContainer.append($tab);
            
            // Create content panel
            const $content = $('<div class="time-content" id="times-' + day + '"></div>');
            if (isFirstTab) {
                $content.addClass('active');
            }
            
            // Add time slots
            if (dayData.times.length > 0) {
                $.each(dayData.times, function(i, time) {
                    const $slot = $('<div class="time-slot" data-time="' + time + '" data-date="' + dayData.date + '">' + time + '</div>');
                    $content.append($slot);
                });
            } else {
                $content.append('<p class="no-times">No available time slots for this day.</p>');
            }
            
            $contentContainer.append($content);
            isFirstTab = false;
        });
        
        // Add tabs and content to container
        $container.append($tabContainer);
        $container.append($contentContainer);
        
        // Tab click handler
        $tabContainer.on('click', '.time-tab', function() {
            const day = $(this).data('day');
            
            // Update active tab
            $tabContainer.find('.time-tab').removeClass('active');
            $(this).addClass('active');
            
            // Update active content
            $contentContainer.find('.time-content').removeClass('active');
            $contentContainer.find('#times-' + day).addClass('active');
        });
        
        // Disable next button until a time is selected
        $('.time-next-btn').prop('disabled', true);
    }
    
    /**
     * Initialize Stripe Elements
     */
    function initStripeElements() {
        if (typeof Stripe === 'undefined') {
            console.warn('Stripe.js is not loaded');
            return;
        }
        
        // Skip if already initialized
        if (document.querySelector('#card-element iframe')) {
            return;
        }
        
        // Initialize Stripe
        const stripe = Stripe('pk_test_your_publishable_key_here');
        const elements = stripe.elements();
        
        // Create card element
        const cardElement = elements.create('card', {
            style: {
                base: {
                    color: '#32325d',
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                }
            }
        });
        
        // Mount card element
        const cardElementContainer = document.getElementById('card-element');
        if (cardElementContainer) {
            cardElement.mount('#card-element');
        }
    }
})(jQuery);