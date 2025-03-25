
// add this to themefile editor/ functions.php
function custom_booking_form_enqueue_scripts() {
    // Debug logging
    error_log('Attempting to enqueue booking scripts');

    // Absolute path check
    $js_path = get_template_directory() . '/js/booking-form.js';
    $css_path = get_template_directory() . '/css/booking-form.css';

    if (file_exists($js_path) && file_exists($css_path)) {
        // Enqueue CSS with cache-busting
        wp_enqueue_style(
            'custom-booking-form-style', 
            get_template_directory_uri() . '/css/booking-form.css', 
            array(), 
            filemtime($css_path)
        );
        
        // Enqueue JS with cache-busting
        wp_enqueue_script(
            'custom-booking-form-script', 
            get_template_directory_uri() . '/js/booking-form.js', 
            array('jquery', 'jquery-ui-datepicker'), 
            filemtime($js_path), 
            true
        );

        // Localize script
        wp_localize_script('custom-booking-form-script', 'bookingFormParams', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('booking_form_nonce'),
        ));

        error_log('Booking scripts successfully enqueued');
    } else {
        error_log('Booking script or CSS file not found');
        error_log('JS Path: ' . $js_path);
        error_log('CSS Path: ' . $css_path);
    }
}
add_action('wp_enqueue_scripts', 'custom_booking_form_enqueue_scripts');

